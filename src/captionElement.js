function processCaptions(captionString) {
  if (!captionString) return [];
  return captionString.split("||").map((caption) => {
    const scs = caption.split("|");
    return { text: scs[0], pos: scs.slice(1) };
  });
}

async function waitForImage(element) {
  return new Promise((resolve) => {
    element.onload = resolve;
    if (element.complete) {
      resolve();
    }
  });
}

async function loadFont(fontName, fontURL) {
  const existing = Array.from(document.fonts.entries()).filter(
    (ff) => ff[0].family === fontName
  );
  if (existing.length > 0) {
    return existing[0][0].loaded;
  }
  const font = new FontFace(fontName, `url(${fontURL})`);
  const loadedFont = await font.load();
  document.fonts.add(loadedFont);
}

class CaptionImage extends HTMLElement {
  static observedAttributes = ["image", "caption"];
  static template = `<style>
      :host { display: block; }
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
      }
      .img-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .img-container img {
        position: absolute;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .fade-in {
        opacity: 0;
        transition: opacity 0.1s ease-in;
      }
      .fade-in.done {
        opacity: 1
      }
    </style>
    <div class="img-container">
      <img id="background-img" />
      <img id="meme-img" class="fade-in" />
    </div>`;

  constructor() {
    super();
  }

  async update() {
    if (this.bgImgElement.src !== new URL(this.imageURL, location).href) {
      this.bgImgElement.src = this.imageURL;
    }

    await Promise.allSettled([
      waitForImage(this.bgImgElement),
      loadFont("Marker Felt", "/MarkerFelt.ttf"),
    ]);

    const width = this.bgImgElement.naturalWidth;
    const height = this.bgImgElement.naturalHeight;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.font = `48px "Marker Felt"`;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.drawImage(this.bgImgElement, 0, 0);
    for (const {
      text,
      pos: [x, y],
    } of this.captions) {
      ctx.fillText(text, x, y);
    }
    const blob = await canvas.convertToBlob({ type: "image/png" });
    if (this.pngDataUrl) {
      URL.revokeObjectURL(this.pngDataUrl);
    }
    this.pngDataUrl = URL.createObjectURL(blob);
    this.memeImgElement.src = this.pngDataUrl;
    this.memeImgElement.classList.add("done");
  }

  connectedCallback() {
    console.log("Custom element added to page.");
    this.imageURL = this.getAttribute("image");
    this.captions = processCaptions(this.getAttribute("caption"));

    const shadow = this.attachShadow({ mode: "open" });
    const content = document.createElement("body");
    content.innerHTML = CaptionImage.template;
    shadow.appendChild(content);
    this.bgImgElement = shadow.getElementById("background-img");
    this.memeImgElement = shadow.getElementById("meme-img");

    this.update();
  }

  disconnectedCallback() {
    console.log("Custom element removed from page.");
  }

  adoptedCallback() {
    console.log("Custom element moved to new page.");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      console.log(`Attribute ${name} has changed.`);
      if (name === "image") {
        this.image = newValue;
      }
      if (name === "caption") {
        this.captions = processCaptions(newValue);
      }
      if (this.bgImgElement) {
        this.update();
      }
    }
  }
}

customElements.define("caption-image", CaptionImage);
