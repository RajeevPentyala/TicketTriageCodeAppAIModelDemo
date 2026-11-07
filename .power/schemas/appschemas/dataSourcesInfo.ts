/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "msdyn_aievents": {
    "tableId": "",
    "version": "",
    "primaryKey": "msdyn_aieventid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "predict": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Dataverse",
    "apis": {
      "Predict": {
        "path": "/api/data/v9.2/msdyn_aimodels({id})/Microsoft.Dynamics.CRM.Predict",
        "method": "POST",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "string",
            "format": "guid"
          },
          {
            "name": "version",
            "in": "body",
            "required": true,
            "type": "string"
          },
          {
            "name": "request",
            "in": "body",
            "required": false,
            "type": "string"
          },
          {
            "name": "requestv2",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "source",
            "in": "body",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      }
    }
  },
  "tickettriageflow": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "Run": {
        "path": "/{connectionId}/triggers/manual/run",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "input",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "object"
          }
        }
      }
    }
  }
};
