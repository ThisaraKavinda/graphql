import { ApolloServer } from '@apollo/server';
import gql from 'graphql-tag';
import { buildSubgraphSchema } from "@apollo/subgraph";
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamoDB = new DynamoDB.DocumentClient();


const typeDefs = gql`
scalar DateTime

directive @tag(name: String!) repeatable on FIELD_DEFINITION

type Banner {
  id: ID!
  title: String @tag(name: "Title")
  description: String @tag(name: "Description")
  redirectUrl: String @tag(name: "Redirect Url")
  createdAt: DateTime! @tag(name: "Created at")
}

type Query {
  allBanners: [Banner!]! @tag(name: "All banners")
}

type Mutation {
  createBanner(title: String!, description: String, redirectUrl: String): Banner @tag(name: "Create Banner")
}
`

const resolvers = {
    Query: {
        allBanners: () => [
          {
            id: 1,
            title: "Swarmio banner",
            description: "",
            redirectUrl: "",
            createdAt : new Date()
          },
          {
            id: 2,
            title: "Exclusive discounts",
            description: "",
            redirectUrl: "",
            createdAt : new Date()
          },
        ],
    },
    Mutation: {
        createBanner: async (_, { title, description, redirectUrl }) => {
          const id = Math.random().toString(36).substr(2, 9); // Generate a random ID
          const createdAt = new Date().toISOString();
    
          // Save the banner to DynamoDB
          const params = {
            TableName: process.env.DYNAMODB_BANNER_TABLE!, // Replace with your DynamoDB table name
            Item: {
              primary_key: id,
              title,
              description,
              redirectUrl,
              createdAt,
            },
          };
    
          await dynamoDB.put(params).promise();
    
          // Return the created banner
          return {
            id,
            title,
            description,
            redirectUrl,
            createdAt,
          };
        },
    },
};

const server = new ApolloServer({
    schema: buildSubgraphSchema({
        typeDefs: typeDefs,
        resolvers: resolvers,
    }),
});

// This final export is important!

export const graphqlHandler = startServerAndCreateLambdaHandler(
  server,
  // We will be using the Proxy V2 handler
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
);
