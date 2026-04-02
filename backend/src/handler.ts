import "dotenv/config";
import serverlessHttp from "serverless-http";
import app from "./app";

// Wrap Express app for AWS Lambda
export const handler = serverlessHttp(app);
