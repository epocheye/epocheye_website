// Server component: renders one or more schema.org objects as JSON-LD.
// `<` is escaped so page text can never close the script tag.
export default function JsonLd({ data }) {
	const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
	return items.map((item, i) => (
		<script
			key={i}
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
		/>
	));
}
