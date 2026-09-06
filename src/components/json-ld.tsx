import type { JsonLd as JsonLdData } from "@/lib/seo/json-ld";

type Props = {
  data: JsonLdData | JsonLdData[];
};

export function JsonLd({ data }: Props) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, index) => (
        <script
          // Stable order; content is server-generated JSON-LD only
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
