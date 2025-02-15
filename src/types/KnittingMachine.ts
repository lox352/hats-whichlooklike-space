import { Point } from "./Point";
import { Stitch } from "./Stitch";
import { StitchType } from "./StitchType";
import { RGB } from "../types/RGB";
import { adjacentStitchDistance, verticalStitchDistance } from "../constants";
import seedrandom from "seedrandom";
import { StarInformation } from "../helpers/star-colouring";

const defaultColour: RGB = [255, 255, 255];

class KnittingMachine {
  private stitchesPerRow: number;
  private rng: () => number;
  stitches: Stitch[];

  constructor(stitchesPerRow: number) {
    this.rng = seedrandom(stitchesPerRow.toString());
    this.stitches = [];
    this.stitchesPerRow = stitchesPerRow;
  }

  castOnRow(
    getStitchPosition: (stitchNumber: number) => Point
  ): KnittingMachine {
    for (let i = 0; i < this.stitchesPerRow; i++) {
      const links = i == 0 ? [] : [i - 1];
      const newStitch: Stitch = {
        id: i,
        position: getStitchPosition(i),
        links,
        starInfo: {
          connectedStars: new Map<string, number[]>(),
        } as StarInformation,
        fixed: true,
        colour: defaultColour,
        type: "k1",
      };
      this.stitches.push(newStitch);
    }

    return this;
  }

  knitRow(pattern: StitchType[]): KnittingMachine {
    const numberOfStitchesInRow = this.numberOfStitchesInRow();
    const patternLength = pattern
      .map((stitchType) => {
        switch (stitchType) {
          case "k1":
            return 1 as number;
          case "k2tog":
            return 2 as number;
          case "k3tog":
            return 3 as number;
          default:
            return 0 as number;
        }
      })
      .reduce((a, b) => a + b, 0);
    const numberOfTimesToKnitPattern = Math.floor(
      numberOfStitchesInRow / patternLength
    );

    for (let i = 0; i < numberOfTimesToKnitPattern; i++) {
      this.knitPattern(pattern);
    }

    return this;
  }

  knit(stitchType: StitchType): KnittingMachine {
    switch (stitchType) {
      case "k1":
        this.knit1();
        break;
      case "k2tog":
        this.knit2Tog();
        break;
      case "k3tog":
        this.knit3Tog();
        break;
      case "join":
        this.join();
        break;
    }

    return this;
  }

  knit1(): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow();
    const lastStitch = this.stitches[this.stitches.length - 1];

    const stitchFromLastRow = this.stitches[lastStitch.links[0]];
    const links = [stitchFromLastRow.id + 1, lastStitch.id];

    const linkedStitch = this.stitches[links[0]];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (linkedStitch.position.x ** 2 + linkedStitch.position.z ** 2) ** 0.5;
    const newPosition = {
      y: linkedStitch.position.y + verticalStitchDistance,
      x: linkedStitch.position.x * radiusScaleFactor,
      z: linkedStitch.position.z * radiusScaleFactor,
    };

    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: newPosition,
      links: links,
      starInfo: {
        connectedStars: new Map<string, number[]>(),
      } as StarInformation,
      type: "k1",
      fixed: false,
      colour: defaultColour,
    };

    this.stitches.push(newStitch);

    return this;
  }

  knit2Tog(): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow() - 1;
    const lastStitch = this.stitches[this.stitches.length - 1];

    const stitchFromLastRow = this.stitches[lastStitch.links[0]];
    const links = [
      stitchFromLastRow.id + 2,
      stitchFromLastRow.id + 1,
      lastStitch.id,
    ];

    const linkedStitch = this.stitches[links[1]];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (linkedStitch.position.x ** 2 + linkedStitch.position.z ** 2) ** 0.5;
    const newPosition = {
      y: linkedStitch.position.y + verticalStitchDistance,
      x: linkedStitch.position.x * radiusScaleFactor,
      z: linkedStitch.position.z * radiusScaleFactor,
    };

    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: newPosition,
      links: links,
      starInfo: {
        connectedStars: new Map<string, number[]>(),
      } as StarInformation,
      type: "k2tog",
      fixed: false,
      colour: defaultColour,
    };

    this.stitches.push(newStitch);

    return this;
  }

  knit3Tog(): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow() - 2;
    const lastStitch = this.stitches[this.stitches.length - 1];

    const stitchFromLastRow = this.stitches[lastStitch.links[0]];
    const links = [
      stitchFromLastRow.id + 3,
      stitchFromLastRow.id + 2,
      stitchFromLastRow.id + 1,
      lastStitch.id,
    ];

    const linkedStitch = this.stitches[links[1]];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (linkedStitch.position.x ** 2 + linkedStitch.position.z ** 2) ** 0.5;
    const newPosition = {
      y: linkedStitch.position.y + verticalStitchDistance,
      x: linkedStitch.position.x * radiusScaleFactor,
      z: linkedStitch.position.z * radiusScaleFactor,
    };

    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: newPosition,
      links: links,
      starInfo: {
        connectedStars: new Map<string, number[]>(),
      } as StarInformation,
      type: "k3tog",
      fixed: false,
      colour: defaultColour,
    };

    this.stitches.push(newStitch);

    return this;
  }

  join(): KnittingMachine {
    const lastStitch = this.stitches[this.stitches.length - 1];
    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: lastStitch.position,
      links: [0, lastStitch.id],
      starInfo: {
        connectedStars: new Map<string, number[]>(),
      } as StarInformation,
      type: "join",
      fixed: true,
      colour: defaultColour,
    };
    this.stitches.push(newStitch);

    return this;
  }

  public decreaseHemispherically(decreaseDistance: number): KnittingMachine {
    for (let i = 0; i < decreaseDistance; i++) {
      this.decreaseOneRowHemispherically(i, decreaseDistance);
    }
    for (let i = 0; i <= this.numberOfStitchesInRow(); i = i + 2) {
      this.knit2Tog();
    }

    return this;
  }

  public decreasePyramidically(polygonalBase: number): KnittingMachine {
    if (this.stitchesPerRow % (polygonalBase * 2) !== 0) {
      throw new Error(
        "Polygonal base must be twice a factor of the number of stitches per row"
      );
    }
    const numberOfDecreases = this.stitchesPerRow / (polygonalBase * 2);
    for (let i = 0; i < numberOfDecreases - 1; i++) {
      this.knit1();
      this.decreaseOneRowPyramidically(polygonalBase);
      if (i <= numberOfDecreases / 2) {
        this.knitRow(["k1"]);
      }
    }

    for (let i = 0; i < polygonalBase; i++) {
      this.knit2Tog();
    }

    return this;
  }

  private knitPattern(pattern: StitchType[]): void {
    pattern.forEach((stitchType) => {
      this.knit(stitchType);
    });
  }

  private decreaseOneRowHemispherically(
    rowIndex: number,
    decreaseDistance: number
  ): void {
    const targetRowCount = Math.ceil(
      this.stitchesPerRow *
        Math.cos((rowIndex + 0.5) * (Math.PI / 2 / decreaseDistance))
    );

    const currentRowCount = this.numberOfStitchesInRow();
    if (currentRowCount <= 12) {
      return;
    }

    const stitchesToRemove = currentRowCount - targetRowCount;

    if (stitchesToRemove < 2) {
      this.knitRow(["k1"]);
      return;
    }

    const segmentLength = Math.floor(currentRowCount / (stitchesToRemove / 2));
    const randomIndex = Math.floor(this.rng() * (segmentLength - 2));
    const segment: StitchType[] = Array.from(
      { length: randomIndex },
      () => "k1"
    );
    segment.push("k3tog");
    for (let i = 0; i < segmentLength - randomIndex - 2; i++) {
      segment.push("k1");
    }

    this.knitRow(segment);
  }

  private decreaseOneRowPyramidically(polygonalBase: number): void {
    const currentRowCount = this.numberOfStitchesInRow();
    const segmentLength = currentRowCount / polygonalBase;
    const segment: StitchType[] = Array.from(
      { length: segmentLength - 3 },
      () => "k1"
    );
    segment.push("k3tog");
    this.knitRow(segment);
  }

  private numberOfStitchesInRow(): number {
    const finalStitch = this.stitches[this.stitches.length - 1];
    return finalStitch.id - this.stitches[finalStitch.links[0]].id;
  }
}

export default KnittingMachine;
