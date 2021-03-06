const util = require('util');

module.exports = {

  friendlyName: 'Find records by geographic radius from an Atlas record by id',

  description: 'Looks up ATLAS records within a given distance from an existing ATLAS record',

  inputs: {
    id: {
      description: 'id of the record to lookup',
      type: 'string',
      required: true
    },
    distance: {
      description: 'The distance to range',
      type: 'number',
      required: true,
      min: 0
    },
    units: {
      description: 'The distance unit [m|km|ft|mi] (default: m)',
      type: 'string',
      defaultsTo: 'm',
      isIn: ['m', 'km', 'ft', 'mi']
    },
    objectType: {
      description: 'Object Type to filter (optional)',
      type: 'string'
    },
    raw: {
      description: 'Return results as raw json',
      type: 'boolean',
      defaultsTo: false
    }
  },


  exits: {
    viewSuccess: {
      responseType: 'view',
      viewTemplatePath: 'pages/results'
    },
    notFound: {
      description: 'No ATLAS record with the specified ID was found in the database.',
      responseType: 'notFound'
    }
  },

  fn: async function (inputs) {
    let record = await Record.findOne({ id: inputs.id });
    if (!record) { throw { notFound: 'No ATLAS record with the specified ID was found in the database.' };}

    let key = sails.config.custom.redis.geokey;
    let results = [];

    await sails.getDatastore('redis').leaseConnection(async (db) => {
      results = await (util.promisify(db.georadiusbymember).bind(db))(key, inputs.id, inputs.distance, inputs.units, 'WITHDIST', 'COUNT', 20, 'ASC');
    });
    let filter = undefined;
    if (inputs.objectType) {
      filter = { objectType: inputs.objectType };
    }
    let geoMergedResults = await Record.mergeGeoResults(results, inputs.units, inputs.id, filter);
    if (inputs.raw) {
      return geoMergedResults;
    } else {
      throw { viewSuccess: { results: geoMergedResults} };
    }
  }
};
