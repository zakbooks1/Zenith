self.__uv$config = {
  prefix: "/a/",
  // Using private Cloudflare Engine for maximum performance and reliability
  bare: "https://autumn-dew-20e7.zak-books1.workers.dev/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/assets/mathematics/handler.js?v=9-30-2024",
  bundle: "/assets/mathematics/bundle.js?v=9-30-2024",
  config: "/assets/mathematics/config.js?v=9-30-2024",
  sw: "/assets/mathematics/sw.js?v=9-30-2024",
};
