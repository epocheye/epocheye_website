// A local stand-in for the CDN: HTTP/2 over TLS with brotli, in front of `next start`.
// `next start` alone serves HTTP/1.1 with gzip, which a phone on Vercel never sees: six
// connections per host instead of one multiplexed one, and larger scripts. Measurements taken
// through this proxy are closer to the deployed site; QUALITY.md reports both.
//
//   openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 7 -subj "/CN=localhost"
//   node docs/play/lighthouse/scripts/h2proxy.mjs <key.pem> <cert.pem> [listen=3443] [upstream=http://localhost:3105]
//
// Chrome must be started with --ignore-certificate-errors (the scripts do that when PLAY_BASE is https).

import { readFileSync } from "node:fs";
import http2 from "node:http2";
import zlib from "node:zlib";

const [keyFile, certFile, listen = "3443", upstream = "http://localhost:3105"] = process.argv.slice(2);
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg|font\/(ttf|otf))/;
const HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-connection", "content-length", "content-encoding"]);
const cache = new Map(); // compressed static files, by URL

const server = http2.createSecureServer({ key: readFileSync(keyFile), cert: readFileSync(certFile), allowHTTP1: false });
server.on("stream", async (stream, headers) => {
	const method = headers[":method"];
	const path = headers[":path"];
	try {
		const fwd = {};
		for (const [k, v] of Object.entries(headers)) if (!k.startsWith(":") && k !== "accept-encoding") fwd[k] = v;
		fwd.host = new URL(upstream).host;
		const body = method === "GET" || method === "HEAD" ? undefined : await new Promise((resolve) => {
			const parts = [];
			stream.on("data", (c) => parts.push(c));
			stream.on("end", () => resolve(Buffer.concat(parts)));
		});
		const res = await fetch(upstream + path, { method, headers: fwd, body, redirect: "manual" });
		const out = { ":status": res.status };
		res.headers.forEach((v, k) => {
			if (!HOP.has(k)) out[k] = v;
		});
		let buf = Buffer.from(await res.arrayBuffer());
		const type = res.headers.get("content-type") || "";
		const wantsBr = /\bbr\b/.test(headers["accept-encoding"] || "");
		if (wantsBr && buf.length > 512 && COMPRESSIBLE.test(type)) {
			const immutable = /\/_next\/static\//.test(path);
			const hit = immutable && cache.get(path);
			// Static files at the top quality (precompressed on a CDN), pages at a fast one.
			buf = hit || zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: immutable ? 11 : 5 } });
			if (immutable) cache.set(path, buf);
			out["content-encoding"] = "br";
			out.vary = "Accept-Encoding";
		}
		out["content-length"] = buf.length;
		stream.respond(out);
		stream.end(method === "HEAD" ? undefined : buf);
	} catch (err) {
		if (!stream.destroyed) {
			stream.respond({ ":status": 502 });
			stream.end(String(err?.message || err));
		}
	}
});
server.listen(Number(listen), () => console.log(`h2 proxy on https://localhost:${listen} -> ${upstream}`));
