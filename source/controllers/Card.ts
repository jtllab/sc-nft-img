import axios, { AxiosResponse } from "axios";
import BigNumber from "bignumber.js";
import { NextFunction, Request, Response } from "express";
import { config } from "../data/config";
import { mergeImages } from "../helper/mergeImages";

const assets: string = `https://gamefantasy.com/`;

// getting a single Card
export async function getImage(req: Request, res: Response, next: NextFunction) {
    // If the API key is valid, proceed with the request
    let id: string = req.params.id;

    let card: any = await getCardDetails(id);
    var image = card.image.replace(/^data:image\/\w+;base64,/, "");
    var buffer = Buffer.from(image, "base64");

    res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": buffer.length,
        "cache-control": "max-age=31536000",
    });

    res.end(buffer);
}

// getting a single Card
export async function getCard(req: Request, res: Response, next: NextFunction) {
    // If the API key is valid, proceed with the request
    let id: string = req.params.id;
    //let card: any = await getCardDetails(id);

    res.setHeader("cache-control", "max-age=31536000");

    return res.status(200).json({
        image: `https://starcrazy.com/game/api/v1/image/${req.params.id}`,
        name: req.params.id,
    });
}

export type NFTInfo = {
    id: string;
    digp: number;
    qlty: QualityImageInfo[];
    style: string[];
    frame: string;
};

export type QualityImageInfo = {
    quality: number;
    img: string;
};

export type CardModel = {
    nft: NFTInfo;
    totalDigP: number;
    imgBase64: string;
    image: string;
};

async function getCardDetails(id: string) {
    var aliana: any = await getAliana(id);
    var cat: any = aliana.data;

    var qlty: any = await geneToQlty(cat.data.aliana.genes);
    var style: any = await geneToStyle(cat.data.aliana.genes);

    let model: CardModel = {
        nft: {
            id: id,
            digp: cat.data.aliana.lpLabor,
            qlty: qlty,
            style: await getCatDataByStyle(style),
            frame: await getFrame({
                qualities: qlty,
                digp: cat.data.aliana.lpLabor,
                buff: cat.data.aliana.bornFightBuff,
            }),
        },
        totalDigP: 0,
        imgBase64: "",
        image: "",
    };
    model.image = await generateImage(model.nft);
    return model;
}

async function geneToQlty(geneId: any): Promise<QualityImageInfo[]> {
    var gene = new BigNumber(geneId);

    var res: QualityImageInfo[] = [];
    for (let i = 0; i < 8; i++) {
        //res[i] = gene.mod(65536).mod(256).toNumber();
        var qlty: number = gene.mod(65536).mod(256).toNumber();
        res[i] = {
            quality: qlty,
            img: `${assets}cat/quality/` + qlty + ".png",
        };
        gene = gene.dividedToIntegerBy(65536);
    }
    return res;
}

async function geneToStyle(geneId: any) {
    var res = [];
    var gene = new BigNumber(geneId);

    for (let i = 0; i < 8; i++) {
        gene = gene.dividedToIntegerBy(256);
        res[i] = gene.mod(256).toNumber();
        gene = gene.dividedToIntegerBy(256);
    }

    return res;
}

async function getCatDataByStyle(style: any): Promise<string[]> {
    let res: string[] = [];

    style.forEach(function (v: any, i: any) {
        var id: any = 1000 * (i + 1) + v + 1;

        let catData: any = config.body[id];

        if (catData != null) {
            res.push(assets + catData.Pic + ".png");
        } else {
            res.push("");
        }
    });
    return res;
}

async function getFrame(data: any): Promise<string> {
    // starz with zero Digp are buff NFT
    if (data.digp <= 0) return getFrameForSpecialNFT(data.buff.id);

    /*
    0 < N < 50
    50 < R < 120
    120 < SR < 240
    240 < SSR < 500
    500 < UR < 9999999
    */
    var sum = 0;

    data.qualities.forEach(function (item: any) {
        var v: any = item.quality;

        if (v == 0) sum += 2; // N dot
        if (v == 1) sum += 10; // R dot
        if (v == 2) sum += 20; // SR dot
        if (v == 3) sum += 40; // SSR dot
        if (v == 4) sum += 100; // UR dot
        /* Sample
            UR 100
            UR 100
            SR 20
            UR 100
            UR 100
            SR 20
            SR 20
            SSR 40
            Tota = 500*/
    });
    // cat/frame/synthesis_03.png
    if (sum >= 0 && sum <= 50) return `${assets}cat/frame/synthesis_06.png`; // normal
    if (sum > 50 && sum <= 120) return `${assets}cat/frame/synthesis_05.png`; // rare
    if (sum > 120 && sum <= 240) return `${assets}cat/frame/synthesis_07.png`; // SR
    if (sum > 240 && sum <= 500) return `${assets}cat/frame/synthesis_03.png`; // SSR
    if (sum > 500 && sum < 999999999) return `${assets}/cat/frame/synthesis_04.png`; // UR
    return "";
}

function getFrameForSpecialNFT(buffId: any) {
    if (config.specialBody[buffId] != null) return config.specialBody[buffId].frame;
    else return config.specialBody["NONSEASONAL"].frame;
}

async function getAliana(id: string) {
    var nftid = new BigNumber(id);

    let title: string = "";
    let body: string = JSON.stringify(generateRequestBody(id));

    const headers = {
        "Content-Type": "application/json",
    };

    let response: AxiosResponse = await axios.post(`https://game.starcrazy.com/api/prod/graphql`, body, {
        headers: headers,
    });

    return response;
}

const generateRequestBody = function (id: string) {
    var jasonBody = {
        operationName: "getAlianaByCatId",
        query: "query getAlianaByCatId($catId: Int!) { aliana(id: $catId) {   id   sireID   matronID   birthTime   genes   isCollections   baseFightAttr {     hp     atk     spd     chr     br     actionPoint     battlePower   }   lpLabor   elementType   bornFightBuff {     id     type     effectStr     effect {       millionthRatioValue       fixedValue       target       valueFromAttr       valueToAttr     }   } }}",
        variables: { catId: id },
        catId: id,
    };
    return jasonBody;
};

async function generateImage(nft: NFTInfo) {
    var image: any = mergeImages(
        nft.id, // nft id
        [
            { src: nft.frame, x: 0, y: 0 }, //frame

            { src: nft.style[5], x: 80, y: 95 }, //skin
            { src: nft.style[6], x: 80, y: 95 }, //tail
            { src: nft.style[7], x: 80, y: 95 }, //tatoo

            { src: nft.style[0], x: 80, y: 95 }, //beard
            { src: nft.style[1], x: 80, y: 95 }, //ear
            { src: nft.style[2], x: 80, y: 95 }, //eye
            { src: nft.style[3], x: 80, y: 95 }, //head
            { src: nft.style[4], x: 80, y: 95 }, //mouth

            // quality bg
            { src: `${assets}/cat/quality/qualitybg.png`, x: 51, y: 249 },

            //qualities
            { src: nft.qlty[0].img, x: 55, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[1].img, x: 73, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[2].img, x: 91, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[3].img, x: 109, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[4].img, x: 127, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[5].img, x: 145, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[6].img, x: 163, y: 255, dw: 20, dh: 20 },
            { src: nft.qlty[7].img, x: 181, y: 255, dw: 20, dh: 20 },
        ]
    );

    return await image;
}
