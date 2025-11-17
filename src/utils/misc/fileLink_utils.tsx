
// use this.plugin.app.metadataCache.resolvedLinks; as the links parameter 

// for single case usage, use const destFile = app.metadataCache.getFirstLinkpathDest(linkText, sourceFilePath);

/** 
 * get the backlinks of a file 
 * @param links 
 * @param targetFile target file path to check backlinks 
 */
export function resolveBackLinks(
    links: Record<string, Record<string, number>>,
    targetFile: string
) {
    if (!links || !targetFile) {
        return [];
    }

    const backLinks = [];
    // check all the source files in the links object 
    for (const [sourceFile, outLinks] of Object.entries(links)) {
        if (outLinks && typeof outLinks === 'object') {
            if (targetFile in outLinks) {
                // add the source file to the backlinks array  
                backLinks.push(sourceFile);
            }
        }
    }
    return backLinks;
}

/**
 * get the forwardlinks of a file 
 * @param links 
 * @param sourceFile 
 * @returns 
 */
export function resolveForwardLinks(
    links: Record<string, Record<string, number>>,
    sourceFile: string
) {
    if (!links || !sourceFile) {
        return [];
    }// return all the target files in the links object for the source file 
    const forwardLinks = links[sourceFile];
    if (!forwardLinks || typeof forwardLinks !== 'object' || Array.isArray(forwardLinks)) {
        return [];
    }
    return Object.keys(forwardLinks);
}
