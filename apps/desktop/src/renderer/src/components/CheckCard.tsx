import type { CheckResult } from "../../../shared/setup-types";
import { prettyStatus, statusTone } from "../lib/steps";

interface CheckCardProps {
  item: CheckResult;
}

export function CheckCard({ item }: CheckCardProps) {
  return (
    <article className={`check-card ${statusTone[item.status]}`}>
      <div className="check-row">
        <div className="min-w-0">
          <h4>{item.label}</h4>
          <p>{item.detail}</p>
        </div>
        <span className="status-chip">{prettyStatus(item.status)}</span>
      </div>
      {item.command ? <code>{item.command}</code> : null}
    </article>
  );
}
