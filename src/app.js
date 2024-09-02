import express from "express";
import bodyParser from "body-parser";
import routes from "./routes.js";

const app = express();

app.use(bodyParser.json());
app.use("/store", routes);

export default app;
