import {
  draftAsText,
  findNeedMarkers,
  unverifiedNumbers,
  type Draft,
} from "@/lib/draft";
import { CopyButton } from "./draft-forms";

export default function DraftView({
  draft,
  ownerText,
  showCopy,
}: {
  draft: Draft;
  // Everything the owner told Bilva, used to check numbers in the copy.
  ownerText: string;
  showCopy: boolean;
}) {
  const needs = findNeedMarkers(draft);
  const numbers = unverifiedNumbers(draft, ownerText);
  const paragraphs = draft.body.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div className="stack-lg">
      <div className="draft-paper stack">
        <h3 className="draft-headline">{draft.headline}</h3>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="draft-text">
            {paragraph}
          </p>
        ))}
        {draft.call_to_action && (
          <p className="draft-text draft-cta">{draft.call_to_action}</p>
        )}
      </div>

      {showCopy && <CopyButton text={draftAsText(draft)} />}

      {needs.length > 0 && (
        <div className="stack">
          <h3>Fill these in before you post</h3>
          <ul className="list-plain">
            {needs.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {numbers.length > 0 && (
        <div className="alert alert-info">
          <strong>Please check these numbers.</strong> They are in the advert
          but you never gave them to Bilva: {numbers.join(", ")}. If you did
          not say them, remove them before posting.
        </div>
      )}

      {draft.owner_notes.length > 0 && (
        <div className="stack">
          <h3>Notes from Bilva</h3>
          <ul className="list-plain">
            {draft.owner_notes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
