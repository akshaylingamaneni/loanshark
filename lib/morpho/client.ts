import { GraphQLClient } from "graphql-request";

const MORPHO_API_URL = "https://api.morpho.org/graphql";

export const morphoClient = new GraphQLClient(MORPHO_API_URL);

export async function query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return morphoClient.request<T>(query, variables);
}

