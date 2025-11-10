import Debugger from "@/debug/debugger";


interface ImageParseResult {
    imagePath: string;
    imageName: string;
    imageExtension: string;
    imageNameWithoutExtension: string;
    tag?: string;
}


export function parseImageTag(imageTag: string): ImageParseResult {
    const mdImageRegex = /!\[([^\]]+)\]\(([^)]+)\)/;
    const linkImageRegex = /<img[^>]+src="([^"]+)"[^>]*>/;
    const match = imageTag.match(imageTagRegex);

    if (!match) {
        Debugger.error(`Invalid image tag: ${imageTag}`);
        return {
            imagePath: '',
            imageName: '',
            imageExtension: '',
        }])
    }
}
