module.exports = function(eleventyConfig) {
  // Exclude component HTML files from template processing
  // (they're static assets fetched at runtime by hero-new.js)
  eleventyConfig.ignores.add("src/assets/components");

  // Copy static assets to output
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/.nojekyll");
  eleventyConfig.addPassthroughCopy({"src/*.png": "/"});
  eleventyConfig.addPassthroughCopy({"src/*.svg": "/"});
  eleventyConfig.addPassthroughCopy({"src/*.webmanifest": "/"});

  // Global data: make year available
  eleventyConfig.addGlobalData("year", new Date().getFullYear());

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["html", "njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
