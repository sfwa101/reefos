import { searchRegistry } from "./SearchRegistry";
import { defaultSearchProvider } from "./providers/defaultProvider";

searchRegistry.register(defaultSearchProvider, true);

export type {
  SearchFilter,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "./SearchRegistry";
export { searchRegistry } from "./SearchRegistry";
