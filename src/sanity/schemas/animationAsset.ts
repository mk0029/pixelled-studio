// Sanity document schema descriptor for animationAsset.
// Drop into a Sanity Studio's schemas array.
export const animationAssetSchema = {
  name: "animationAsset",
  title: "Animation Asset",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (r: any) => r.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
    { name: "category", title: "Category", type: "string", options: { list: ["Toran", "Matrix", "Wedding", "Characters", "Abstract"] } },
    { name: "format", title: "Format", type: "string", options: { list: [".swf", ".avi", ".tol"] } },
    { name: "resolution", title: "Resolution", type: "string", description: "e.g. 16x60" },
    { name: "file", title: "File", type: "file" },
    { name: "previewThumbnail", title: "Preview thumbnail", type: "image", options: { hotspot: true } },
    { name: "tags", title: "Tags", type: "array", of: [{ type: "string" }] },
    { name: "sourceAttribution", title: "Source attribution", type: "string" },
  ],
};