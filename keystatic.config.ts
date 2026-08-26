import { collection, config, fields } from "@keystatic/core";
import { isProduction } from "@repo/env/web/client";

const createPostsCollection = ({
  label,
  locale,
}: {
  label: string;
  locale: "ca" | "es" | "en";
}) =>
  collection({
    label,
    slugField: "title",
    path: `content/blog/${locale}/*`,
    format: { contentField: "body" },
    columns: ["title", "publishDate", "draft"],
    previewUrl: `/${locale}/blog/{slug}`,
    schema: {
      title: fields.slug({
        name: {
          label: "títol",
          validation: { isRequired: true },
        },
        slug: {
          label: "slug",
          description: "part final de l'adreça de l'article",
        },
      }),
      publishDate: fields.date({
        label: "data de publicació",
        defaultValue: { kind: "today" },
        validation: { isRequired: true },
      }),
      author: fields.text({
        label: "autoria",
        validation: { isRequired: true },
      }),
      excerpt: fields.text({
        label: "resum",
        multiline: true,
        validation: { isRequired: true, length: { max: 240 } },
      }),
      coverImage: fields.image({
        label: "imatge de portada",
        directory: `content/blog/${locale}`,
        publicPath: `/api/blog-assets/${locale}/`,
        validation: { isRequired: true },
      }),
      tags: fields.array(
        fields.text({ label: "etiqueta", validation: { isRequired: true } }),
        {
          label: "etiquetes",
          itemLabel: (props) => props.value,
        },
      ),
      draft: fields.checkbox({
        label: "esborrany",
        description: "els esborranys només es poden veure en desenvolupament",
        defaultValue: true,
      }),
      translationKey: fields.text({
        label: "clau de traducció",
        description:
          "mateixa clau en totes les versions lingüístiques de l'article",
        validation: {
          isRequired: true,
          pattern: {
            regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            message: "fes servir minúscules, números i guionets",
          },
        },
      }),
      body: fields.markdoc({
        label: "contingut",
        extension: "md",
        options: {
          image: {
            directory: `content/blog/${locale}`,
            publicPath: `/api/blog-assets/${locale}/`,
          },
        },
      }),
    },
  });

export default config({
  storage: isProduction
    ? { kind: "github", repo: "jtayped/iaeste-web" }
    : { kind: "local" },
  ui: {
    brand: { name: "iaeste lc lleida" },
    navigation: {
      articles: ["postsCa", "postsEs", "postsEn"],
    },
  },
  collections: {
    postsCa: createPostsCollection({
      label: "articles en català",
      locale: "ca",
    }),
    postsEs: createPostsCollection({
      label: "articles en castellà",
      locale: "es",
    }),
    postsEn: createPostsCollection({
      label: "articles en anglès",
      locale: "en",
    }),
  },
});
