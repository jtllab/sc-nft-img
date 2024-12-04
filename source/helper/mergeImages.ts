import { Canvas, Image } from "canvas";

export type Constructor<T = unknown> = new (...args: any[]) => T;

export type TSource = {
    src: string;
    x: number;
    y: number;
    dw?: number;
    dh?: number;
    opacity?: number;
};

export type ImageRes = TSource & {
    img: Image;
};

// Return Promise
export function mergeImages(id: string, sources: TSource[]) {
    return new Promise(function (resolve) {
        // Load sources
        var images = sources.map(function (source) {
            return new Promise<ImageRes>(function (resolve, reject) {
                // Resolve source and img when loaded
                var img = new Image();
                img.onerror = function (err: any) {
                    return reject(new Error("Couldn't load image: " + err + JSON.stringify(source)));
                };
                img.onload = function () {
                    return resolve(Object.assign({} as ImageRes, source, { img: img }));
                };
                img.src = source.src;
            });
        });

        // When sources have loaded
        resolve(
            Promise.all(images).then(function (images) {
                // Set canvas dimensions
                const width = Math.max.apply(
                    Math,
                    images.map(function (image) {
                        return image.img.width;
                    })
                );
                const height = Math.max.apply(
                    Math,
                    images.map(function (image) {
                        return image.img.height;
                    })
                );

                var canvas = new Canvas(width, height);
                // Get canvas context
                var ctx = canvas.getContext("2d");

                // Draw images to canvas
                images.forEach(function (image) {
                    ctx.globalAlpha = image.opacity ? image.opacity : 1;
                    if (image.dw != null && image.dh != null) {
                        return ctx.drawImage(image.img, image.x || 0, image.y || 0, image.dw, image.dh);
                    } else {
                        return ctx.drawImage(image.img, image.x || 0, image.y || 0);
                    }
                });

                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.font = "16.5px Arial";
                ctx.fillText(id, canvas.width / 2, canvas.height - 52);

                // Resolve all other data URIs sync
                return canvas.toDataURL();
            })
        );
    });
}
