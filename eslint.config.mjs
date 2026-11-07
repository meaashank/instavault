import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      // Archive media uses local Blob URLs and must not be routed through an image optimizer.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
