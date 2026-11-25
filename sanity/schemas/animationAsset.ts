export default {
  name: "animationAsset",
  title: "Animation Asset",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "format",
      title: "Format",
      type: "string",
      options: {
        list: [
          { title: "SWF (Flash Vector)", value: "swf" },
          { title: "AVI (LEDEdit Video)", value: "avi" },
          { title: "TOL (LEDEdit Template)", value: "tol" },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "category",
      title: "Category",
      type: "string",
      initialValue: "Building & Gate",
    },
    {
      name: "resolution",
      title: "Resolution (e.g. 16x60, 32x64, Universal)",
      type: "string",
      initialValue: "Universal",
    },
    {
      name: "sourcePack",
      title: "Source Pack / Folder Name",
      type: "string",
    },
    {
      name: "fileHash",
      title: "MD5 File Hash (Deduplication)",
      type: "string",
      readOnly: true,
    },
    {
      name: "file",
      title: "Animation File",
      type: "file",
      options: { accept: ".swf,.avi,.tol" },
      validation: (Rule: any) => Rule.required(),
    },
  ],
  preview: {
    select: {
      title: "title",
      format: "format",
      category: "category",
      resolution: "resolution",
    },
    prepare({ title, format, category, resolution }: any) {
      return {
        title,
        subtitle: `${(format || "").toUpperCase()} • ${category || "General"} • ${resolution || "Universal"}`,
      };
    },
  },
};
