import express, { Express } from "express";
import http from "http";
import { newRouter } from "./routes/Card";

const router: Express = express();

/** Parse the request */
router.use(express.urlencoded({ extended: false }));

/** Takes care of JSON data */
router.use(express.json());

/** RULES OF OUR API */
router.use((req, res, next) => {
    // set the CORS policy
    res.header("Access-Control-Allow-Origin", "*");
    // set the CORS headers
    res.header("Access-Control-Allow-Headers", "origin, X-Requested-With,Content-Type,Accept, Authorization");
    // set the CORS method headers
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET");
        return res.status(200).json({});
    }
    next();
});

/** Routes */
router.use("/", newRouter());

/** Error handling */
router.use((req, res, next) => {
    const error = new Error("not found");
    return res.status(404).json({
        message: error.message,
    });
});

/** Server */
const httpServer = http.createServer(router);
const PORT: any = 4000;
console.log(httpServer);
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
