import LoadError from "./LoadError";
import { PageSkeleton, TableSkeleton } from "./Skeleton";

// Shows a loading skeleton or an error for a react-query result, and the page itself once the data is there:
//   <QueryState query={exams}>{(rows) => <Table rows={rows} />}</QueryState>
export default function QueryState({ query, children, table = false }) {
  if (query.isPending) return table ? <TableSkeleton /> : <PageSkeleton />;
  if (query.isError) return <LoadError error={query.error} onRetry={query.refetch} />;
  return children(query.data);
}
