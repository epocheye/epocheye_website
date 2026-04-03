"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const PORT = parseInt(process.env.PORT ?? "3001", 10);
app_1.default.listen(PORT, () => {
    console.log(`[creator-backend] Listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map