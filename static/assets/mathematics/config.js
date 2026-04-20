self.__uv$config = {
  prefix: "/a/",
  // Updated to a more stable Bare server
  bare: "https://bare.benroxy.com/", 
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  // Ensure these paths match your actual GitHub folder structure
  handler: "/assets/mathematics/handler.js?v=4-20-2026",
  bundle: "/assets/mathematics/bundle.js?v=4-20-2026",
  config: "/assets/mathematics/config.js?v=4-20-2026",
  sw: "/assets/mathematics/sw.js?v=4-20-2026",
};
