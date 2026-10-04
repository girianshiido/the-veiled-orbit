import type { SceneryObject } from "../types/game";

export class SceneryRenderer {
  private readonly lumenStudyAtlas: HTMLImageElement;
  private readonly worldLandmarkAtlas: HTMLImageElement;
  private readonly controlTowerAtlas: HTMLImageElement;
  private readonly southwakeLandmarkAtlas: HTMLImageElement;
  private readonly echoVaultPylon: HTMLImageElement;
  private readonly regionalBuildings: Record<string, HTMLImageElement>;
  private readonly lumenHdSprites: Record<
    "home" | "shop" | "memory" | "transit" | "tree" | "inn" | "item" | "clinic" | "armor",
    HTMLImageElement
  >;

  constructor(private readonly ctx: CanvasRenderingContext2D) {
    this.lumenStudyAtlas = new Image();
    this.lumenStudyAtlas.src = `${import.meta.env.BASE_URL}assets/graphics/lumen-study-scenery-v1.png`;
    this.worldLandmarkAtlas = new Image();
    this.worldLandmarkAtlas.src = `${import.meta.env.BASE_URL}assets/graphics/world-landmarks-hd-v1.png`;
    this.controlTowerAtlas = new Image();
    this.controlTowerAtlas.src = `${import.meta.env.BASE_URL}assets/graphics/control-towers-hd-v1.png`;
    this.southwakeLandmarkAtlas = new Image();
    this.southwakeLandmarkAtlas.src = `${import.meta.env.BASE_URL}assets/graphics/southwake-landmarks-hd-v1.png`;
    this.echoVaultPylon = this.loadImage("echo-vault-pylon-hd-v1.png");
    this.regionalBuildings = Object.fromEntries(
      ["aster", "vesper", "tideglass"].flatMap((region) => (
        ["memory", "transit", "inn", "weapon", "item", "clinic", "armor", "harbor"].map((role) => {
          const id = `${region}-hd-${role}`;
          return [id, this.loadImage(`${region}-${role}-hd-v1.png`)];
        })
      )),
    );
    this.lumenHdSprites = {
      home: this.loadImage("lumen-home-hd-v1.png"),
      shop: this.loadImage("lumen-shop-hd-v1.png"),
      memory: this.loadImage("lumen-memory-hd-v1.png"),
      transit: this.loadImage("lumen-transit-hd-v1.png"),
      tree: this.loadImage("lumen-tree-hd-v1.png"),
      inn: this.loadImage("lumen-inn-hd-v1.png"),
      item: this.loadImage("lumen-item-shop-hd-v1.png"),
      clinic: this.loadImage("lumen-clinic-hd-v1.png"),
      armor: this.loadImage("lumen-armor-shop-hd-v1.png"),
    };
  }

  public draw(object: SceneryObject): void {
    const regionalBuilding = this.regionalBuildings[object.spriteId];
    if (regionalBuilding) {
      this.drawRegionalBuilding(
        regionalBuilding,
        object.x,
        object.y,
        object.width,
        object.height,
        object.spriteId === "vesper-hd-armor" ? 103 : undefined,
      );
      return;
    }
    switch (object.spriteId) {
      case "signal-tree":
        this.drawSignalTree(object.x, object.y);
        break;
      case "lumen-study-tree":
        this.drawHdSprite("tree", object.x - 16, object.y - 40, 80, 96, () => this.drawSignalTree(object.x + 8, object.y));
        break;
      case "relay-pylon":
        this.drawRelayPylon(object.x, object.y);
        break;
      case "echo-vault-pylon":
        this.drawEchoVaultPylon(object.x, object.y, object.width, object.height);
        break;
      case "garden-pavilion":
        this.drawGardenPavilion(object.x, object.y);
        break;
      case "hollow-inn":
        this.drawHollowInn(object.x, object.y);
        break;
      case "lumen-study-home":
        this.drawHdSprite("home", object.x, object.y, 80, 80, () => this.drawHollowInn(object.x, object.y));
        break;
      case "signal-market":
        this.drawSignalMarket(object.x, object.y);
        break;
      case "lumen-study-shop":
        // Preserve the shop's corrected proportions while keeping its lowered
        // painted threshold at the same position.
        this.drawHdSprite("shop", object.x, object.y - 16, 80, 96, () => this.drawSignalMarket(object.x, object.y));
        break;
      case "lumen-hd-memory":
        this.drawHdSprite("memory", object.x, object.y, 80, 80, () => this.drawGardenPavilion(object.x, object.y));
        break;
      case "lumen-hd-transit":
        this.drawHdSprite("transit", object.x, object.y, 80, 80, () => this.drawLumenSpire(object.x, object.y));
        break;
      case "lumen-hd-inn":
        this.drawHdSprite("inn", object.x, object.y, 80, 80, () => this.drawHollowInn(object.x, object.y));
        break;
      case "lumen-hd-item":
        this.drawHdSprite("item", object.x, object.y, 80, 80, () => this.drawSignalMarket(object.x, object.y));
        break;
      case "lumen-hd-clinic":
        this.drawHdSprite("clinic", object.x, object.y, 80, 80, () => this.drawLumenSpire(object.x, object.y));
        break;
      case "lumen-hd-armor":
        this.drawHdSprite("armor", object.x, object.y, 80, 80, () => this.drawSignalMarket(object.x, object.y));
        break;
      case "lumen-spire":
        this.drawLumenSpire(object.x, object.y);
        break;
      case "world-village":
        this.drawWorldLandmark(object.x, object.y, object.name.includes("Aster") ? 1 : object.name.includes("Vesper") ? 2 : 0,
          () => this.drawWorldVillage(object.x, object.y, object.name));
        break;
      case "world-vault":
        this.drawWorldLandmark(object.x, object.y, 3, () => this.drawWorldVault(object.x, object.y));
        break;
      case "world-tideglass":
        this.drawSouthwakeLandmark(object.x, object.y, 0, () => this.drawWorldVillage(object.x, object.y, object.name));
        break;
      case "world-moonfall-array":
        this.drawSouthwakeLandmark(object.x, object.y, 1, () => this.drawWorldVault(object.x, object.y));
        break;
      case "world-control-tower-west":
        this.drawControlTower(object.x, object.y, 0);
        break;
      case "world-control-tower-central":
        this.drawControlTower(object.x, object.y, 1);
        break;
      case "world-control-tower-east":
        this.drawControlTower(object.x, object.y, 2);
        break;
    }
  }

  private loadImage(filename: string): HTMLImageElement {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}assets/graphics/${filename}`;
    return image;
  }

  private drawHdSprite(
    sprite: keyof SceneryRenderer["lumenHdSprites"],
    x: number,
    y: number,
    width: number,
    height: number,
    fallback: () => void,
  ): void {
    const image = this.lumenHdSprites[sprite];
    if (!image.complete || image.naturalWidth === 0) {
      fallback();
      return;
    }
    this.ctx.drawImage(image, Math.round(x), Math.round(y), width, height);
  }

  private drawStudySprite(
    sourceX: number,
    width: number,
    height: number,
    x: number,
    y: number,
    fallback: () => void,
  ): void {
    if (!this.lumenStudyAtlas.complete || this.lumenStudyAtlas.naturalWidth === 0) {
      fallback();
      return;
    }
    this.ctx.drawImage(this.lumenStudyAtlas, sourceX, 0, width, height, Math.round(x), Math.round(y), width, height);
  }

  private drawWorldLandmark(x: number, y: number, index: number, fallback: () => void): void {
    if (!this.worldLandmarkAtlas.complete || this.worldLandmarkAtlas.naturalWidth === 0) {
      fallback();
      return;
    }
    this.ctx.drawImage(this.worldLandmarkAtlas, index * 96, 0, 96, 128, Math.round(x), Math.round(y), 48, 64);
  }

  private drawControlTower(x: number, y: number, index: number): void {
    if (!this.controlTowerAtlas.complete || this.controlTowerAtlas.naturalWidth === 0) {
      this.drawWorldVault(x, y);
      return;
    }
    this.ctx.drawImage(this.controlTowerAtlas, index * 96, 0, 96, 128, Math.round(x), Math.round(y), 48, 64);
  }

  private drawSouthwakeLandmark(x: number, y: number, index: number, fallback: () => void): void {
    if (!this.southwakeLandmarkAtlas.complete || this.southwakeLandmarkAtlas.naturalWidth === 0) {
      fallback();
      return;
    }
    this.ctx.drawImage(this.southwakeLandmarkAtlas, index * 96, 0, 96, 128, Math.round(x), Math.round(y), 48, 64);
  }

  private drawRegionalBuilding(
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    sourceWidth?: number,
  ): void {
    if (!image.complete || image.naturalWidth === 0) {
      this.drawSignalMarket(x, y);
      return;
    }
    if (sourceWidth && sourceWidth < image.naturalWidth) {
      const renderedWidth = width * sourceWidth / image.naturalWidth;
      this.ctx.drawImage(
        image,
        0,
        0,
        sourceWidth,
        image.naturalHeight,
        Math.round(x),
        Math.round(y),
        renderedWidth,
        height,
      );
      return;
    }
    this.ctx.drawImage(image, Math.round(x), Math.round(y), width, height);
  }

  private drawEchoVaultPylon(x: number, y: number, width: number, height: number): void {
    if (!this.echoVaultPylon.complete || this.echoVaultPylon.naturalWidth === 0) {
      this.drawRelayPylon(x + Math.round((width - 24) / 2), y + height - 64);
      return;
    }
    this.ctx.drawImage(this.echoVaultPylon, Math.round(x), Math.round(y), width, height);
  }

  private drawSignalTree(x: number, y: number): void {
    this.rect(x + 11, y + 57, 20, 4, "#09121b99");
    this.rect(x + 16, y + 31, 10, 27, "#172b2d");
    this.rect(x + 18, y + 32, 5, 26, "#38534a");
    this.rect(x + 22, y + 35, 2, 20, "#8a7250");
    this.rect(x + 10, y + 34, 9, 4, "#27443e");
    this.rect(x + 7, y + 30, 7, 4, "#27443e");
    this.rect(x + 23, y + 28, 7, 4, "#27443e");

    this.rect(x + 8, y + 8, 17, 30, "#162a32");
    this.rect(x + 3, y + 15, 27, 17, "#23483f");
    this.rect(x + 7, y + 6, 17, 29, "#315f4e");
    this.rect(x + 1, y + 19, 8, 10, "#315f4e");
    this.rect(x + 22, y + 13, 9, 17, "#315f4e");
    this.rect(x + 10, y + 3, 10, 7, "#467b60");
    this.rect(x + 5, y + 13, 8, 8, "#467b60");
    this.rect(x + 18, y + 10, 7, 12, "#51886a");
    this.rect(x + 10, y + 17, 12, 11, "#3f7159");
    this.rect(x + 4, y + 24, 6, 5, "#244c43");
    this.rect(x + 23, y + 23, 6, 7, "#244c43");

    this.rect(x + 8, y + 12, 2, 2, "#8de6bd");
    this.rect(x + 24, y + 17, 2, 3, "#d9b5ef");
    this.rect(x + 14, y + 7, 2, 2, "#e9cf6a");
    this.rect(x + 19, y + 25, 2, 2, "#78e0c2");
    this.rect(x + 14, y + 45, 14, 3, "#111b27");
    this.rect(x + 16, y + 45, 10, 1, "#78e0c2");
  }

  private drawRelayPylon(x: number, y: number): void {
    this.rect(x + 3, y + 58, 21, 3, "#09121b99");
    this.rect(x + 8, y + 14, 10, 45, "#101927");
    this.rect(x + 10, y + 15, 6, 42, "#34445d");
    this.rect(x + 12, y + 18, 2, 37, "#6a7890");
    this.rect(x + 4, y + 25, 18, 4, "#172236");
    this.rect(x + 2, y + 26, 22, 2, "#7b6d9e");
    this.rect(x + 6, y + 38, 14, 4, "#172236");
    this.rect(x + 4, y + 39, 18, 2, "#7b6d9e");
    this.rect(x + 9, y + 7, 8, 9, "#1d2b42");
    this.rect(x + 11, y + 4, 4, 5, "#263c50");
    this.rect(x + 12, y + 1, 2, 4, "#78e0c2");
    this.rect(x + 11, y + 10, 4, 3, "#d9b5ef");
    this.rect(x + 7, y + 55, 12, 5, "#222b3d");
    this.rect(x + 9, y + 56, 8, 2, "#e9cf6a");
  }

  private drawGardenPavilion(x: number, y: number): void {
    this.rect(x + 3, y + 73, 58, 5, "#09121b99");
    this.rect(x + 4, y + 27, 56, 45, "#152132");
    this.rect(x + 7, y + 31, 50, 37, "#23354b");
    this.rect(x + 12, y + 35, 40, 30, "#0d1724");

    this.rect(x + 2, y + 20, 60, 9, "#111a2a");
    this.rect(x + 7, y + 14, 50, 8, "#35455d");
    this.rect(x + 13, y + 9, 38, 7, "#465a72");
    this.rect(x + 21, y + 5, 22, 6, "#26394e");
    this.rect(x + 28, y + 1, 8, 5, "#5e7088");
    this.rect(x + 5, y + 22, 54, 2, "#78e0c2");
    this.rect(x + 10, y + 17, 44, 2, "#7b6d9e");

    this.rect(x + 7, y + 29, 8, 42, "#3c5065");
    this.rect(x + 10, y + 32, 3, 34, "#667b91");
    this.rect(x + 49, y + 29, 8, 42, "#3c5065");
    this.rect(x + 51, y + 32, 3, 34, "#667b91");
    this.rect(x + 3, y + 67, 58, 7, "#293a50");
    this.rect(x + 8, y + 68, 48, 2, "#8c8a73");

    this.rect(x + 23, y + 41, 18, 22, "#17263a");
    this.rect(x + 27, y + 37, 10, 5, "#354b64");
    this.rect(x + 29, y + 43, 6, 15, "#5a4674");
    this.rect(x + 30, y + 45, 4, 10, "#d9b5ef");
    this.rect(x + 21, y + 58, 22, 4, "#26394d");

    this.rect(x + 15, y + 43, 3, 15, "#315f4e");
    this.rect(x + 17, y + 45, 4, 4, "#4f8b69");
    this.rect(x + 44, y + 39, 3, 19, "#315f4e");
    this.rect(x + 40, y + 45, 5, 4, "#4f8b69");
    this.rect(x + 18, y + 51, 2, 2, "#e9cf6a");
    this.rect(x + 42, y + 41, 2, 2, "#78e0c2");
  }

  private drawHollowInn(x: number, y: number): void {
    this.rect(x + 3, y + 76, 74, 4, "#07101799");
    this.rect(x + 5, y + 31, 70, 44, "#263a48");
    this.rect(x + 9, y + 35, 62, 35, "#385260");
    this.rect(x + 2, y + 24, 76, 10, "#172632");
    this.rect(x + 8, y + 16, 64, 10, "#52616d");
    this.rect(x + 17, y + 9, 46, 9, "#66737a");
    this.rect(x + 28, y + 3, 24, 8, "#354b58");
    this.rect(x + 6, y + 26, 68, 2, "#78e0c2");
    this.rect(x + 13, y + 42, 13, 13, "#142533");
    this.rect(x + 15, y + 44, 9, 7, "#d3a967");
    this.rect(x + 54, y + 42, 13, 13, "#142533");
    this.rect(x + 56, y + 44, 9, 7, "#d3a967");
    this.rect(x + 31, y + 48, 18, 25, "#14212e");
    this.rect(x + 35, y + 52, 10, 21, "#5f496c");
    this.rect(x + 42, y + 61, 2, 2, "#e9cf6a");
    this.rect(x + 62, y + 29, 13, 12, "#293b47");
    this.rect(x + 65, y + 31, 7, 2, "#d9b5ef");
    this.rect(x + 67, y + 34, 3, 4, "#d9b5ef");
    this.rect(x + 11, y + 68, 58, 6, "#263540");
  }

  private drawSignalMarket(x: number, y: number): void {
    this.rect(x + 2, y + 68, 60, 4, "#07101799");
    this.rect(x + 5, y + 28, 54, 39, "#2d3848");
    this.rect(x + 9, y + 32, 46, 30, "#45505e");
    this.rect(x + 1, y + 21, 62, 10, "#1b2433");
    this.rect(x + 7, y + 14, 50, 9, "#6a526f");
    this.rect(x + 15, y + 8, 34, 8, "#80647f");
    this.rect(x + 6, y + 23, 52, 2, "#e9cf6a");
    this.rect(x + 12, y + 39, 15, 11, "#101b29");
    this.rect(x + 14, y + 41, 11, 3, "#78e0c2");
    this.rect(x + 37, y + 39, 15, 11, "#101b29");
    this.rect(x + 39, y + 41, 11, 3, "#78e0c2");
    this.rect(x + 24, y + 48, 16, 20, "#192332");
    this.rect(x + 28, y + 52, 8, 16, "#69516f");
    this.rect(x + 34, y + 59, 2, 2, "#e9cf6a");
    this.rect(x + 8, y + 59, 13, 5, "#2b3542");
    this.rect(x + 43, y + 57, 12, 7, "#2b3542");
  }

  private drawLumenSpire(x: number, y: number): void {
    this.rect(x + 4, y + 76, 24, 4, "#07101799");
    this.rect(x + 9, y + 27, 14, 49, "#172735");
    this.rect(x + 12, y + 29, 8, 45, "#536575");
    this.rect(x + 15, y + 31, 2, 39, "#8a9ba8");
    this.rect(x + 6, y + 39, 20, 4, "#253847");
    this.rect(x + 4, y + 40, 24, 2, "#7b6d9e");
    this.rect(x + 10, y + 18, 12, 11, "#253948");
    this.rect(x + 13, y + 9, 6, 11, "#3b5664");
    this.rect(x + 15, y + 2, 2, 8, "#78e0c2");
    this.rect(x + 13, y + 23, 6, 3, "#d9b5ef");
    this.rect(x + 8, y + 56, 16, 20, "#101927");
    this.rect(x + 11, y + 59, 10, 17, "#4b3f67");
    this.rect(x + 14, y + 61, 4, 13, "#d9b5ef");
    this.rect(x + 7, y + 71, 18, 6, "#303d4a");
    this.rect(x + 11, y + 72, 10, 2, "#e9cf6a");
  }

  private drawWorldVillage(x: number, y: number, name: string): void {
    const aster = name.includes("Aster");
    const vesper = name.includes("Vesper");
    const roof = vesper ? "#795444" : aster ? "#6b526f" : "#465f6b";
    const light = vesper ? "#e9cf6a" : aster ? "#d9b5ef" : "#78e0c2";
    const wall = vesper ? "#4f4540" : aster ? "#454252" : "#344d58";
    this.rect(x + 2, y + 57, 44, 5, "#07101799");
    this.rect(x + 4, y + 49, 40, 9, "#1b2b38");
    this.rect(x + 7, y + 51, 34, 4, roof);

    this.rect(x + 4, y + 30, 15, 20, "#182733");
    this.rect(x + 7, y + 25, 9, 7, roof);
    this.rect(x + 6, y + 34, 11, 13, wall);
    this.rect(x + 9, y + 37, 5, 3, light);

    this.rect(x + 16, y + 20, 18, 30, "#1b2c39");
    this.rect(x + 19, y + 14, 12, 8, roof);
    this.rect(x + 21, y + 10, 8, 6, roof);
    this.rect(x + 20, y + 25, 10, 21, wall);
    this.rect(x + 23, y + 28, 4, 4, light);
    this.rect(x + 23, y + 36, 4, 4, light);

    this.rect(x + 32, y + 32, 12, 18, "#182733");
    this.rect(x + 34, y + 27, 8, 7, roof);
    this.rect(x + 34, y + 36, 8, 11, wall);
    this.rect(x + 36, y + 39, 4, 3, light);

    this.rect(x + 23, y + 3, 2, 8, "#536879");
    this.rect(x + 22, y + 1, 4, 3, light);
    this.rect(x + 13, y + 52, 3, 3, light);
    this.rect(x + 32, y + 52, 3, 3, light);
  }

  private drawWorldVault(x: number, y: number): void {
    this.rect(x + 3, y + 59, 42, 4, "#07101799");
    this.rect(x + 8, y + 24, 32, 35, "#202b3a");
    this.rect(x + 12, y + 18, 24, 39, "#3a4655");
    this.rect(x + 16, y + 9, 16, 11, "#273848");
    this.rect(x + 21, y + 2, 6, 9, "#526477");
    this.rect(x + 23, y, 2, 5, "#d9b5ef");
    this.rect(x + 18, y + 39, 12, 20, "#0e1724");
    this.rect(x + 21, y + 43, 6, 16, "#665077");
    this.rect(x + 7, y + 27, 34, 2, "#78e0c2");
    this.rect(x + 10, y + 52, 28, 6, "#182331");
  }

  private rect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), width, height);
  }
}
