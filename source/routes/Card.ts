import express, { Router } from "express";
import { getCard, getImage } from "../controllers/Card";

export function newRouter(): Router {
    const router = express.Router();

    router.get("/api/v1/card/:id", getCard);
    router.get("/api/v1/image/:id", getImage);

    return router;
}
