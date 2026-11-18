type Props = {
  html: string
}

/** Renders API-published bodyHtml with the same prose styling as ContentRenderer. */
export function HtmlBody({ html }: Props) {
  return (
    <div
      className="prose prose-slate max-w-none prose-h2:mt-10 prose-h2:text-slate-900 prose-h3:text-slate-900 prose-a:text-orange-700 prose-img:rounded-2xl prose-img:border prose-img:border-slate-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
