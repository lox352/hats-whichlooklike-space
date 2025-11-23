import { Stitch } from "../types/Stitch";

export function constructConnections(stitches: Stitch[]): [number, number][] {
    const deduplicated = new Set(
        stitches.flatMap((stitch) =>
            stitch?.starInfo?.connectedStars
                ? Array.from(stitch.starInfo.connectedStars).flatMap((d) =>
                    d[1].map((e) => JSON.stringify([stitch.id, e].sort()))
                )
                : []
        )
    );
    return Array.from(deduplicated).map(
        (item) => JSON.parse(item) as [number, number]
    );
}
