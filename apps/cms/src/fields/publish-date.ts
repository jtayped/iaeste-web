import type { DateField } from "payload";

/** Publication date, set to now on first publication unless an editor picked one. */
export function publishDateField(): DateField {
  return {
    name: "publishDate",
    type: "date",
    label: "data de publicació",
    admin: {
      position: "sidebar",
      description: "es fixa a la primera publicació si no se n'indica cap",
    },
    hooks: {
      beforeChange: [
        ({ value, data, originalDoc }) => {
          if (value) return value;
          const publishing =
            data?._status === "published" &&
            originalDoc?._status !== "published";
          return publishing ? new Date().toISOString() : value;
        },
      ],
    },
  };
}
