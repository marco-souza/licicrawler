#! env node
const axios = require('axios');
const fs = require('fs');
const moment = require('moment');
const { filter, map, orderBy } = require('lodash');

let offset = process.argv[2] || 0;
let nextUrl = 0;

const checkKeywords = ({ objeto, data_entrega_proposta }) => {
  const keywords = [
    'Tecnologia da Informática',
    'TI',
    'Software',
  ];

  if (!objeto) return false;
  const daysUntilClose = moment(data_entrega_proposta).diff(moment(), 'days');

  return keywords
    .map(word =>
      objeto.includes(word) // includes interested words
      // && daysUntilClose > 5 // Not closed
    )
    .reduce((acc, cur) => acc || cur)
}

const loadMoreData = (loaded) => {

  if (nextUrl === undefined) {
    console.log('No next url');
    return;
  }
  const url = `http://compras.dados.gov.br${nextUrl.href || `/licitacoes/v1/licitacoes.json?offset=${offset}`}`;

  return axios
    .get(url)
    .then(res => res.data)
    .then(data => {
        // save next url
        nextUrl = data._links.next;
        console.log('url', url);

        // get filtered data
        const result = orderBy([
          ...(loaded ? loaded : []),
          ...filter(data._embedded.licitacoes, checkKeywords)
            .map(({objeto, _links, data_entrega_proposta}) => ({ objeto, links: _links, data_entrega_proposta}))
        ], ['data_entrega_proposta'], ['desc']);

        // Call loadmore or return result, if no next
        return nextUrl === undefined
          ? new Promise((resolve, reject) => resolve(result))
          : loadMoreData(result)
      })
      .catch(err => {
        nextUrl = undefined;
        // Call loadmore or return result, if no next
        return new Promise((resolve, reject) => resolve(loaded))
      });
}

loadMoreData().then((data) => {
  fs.writeFile(`${moment().toISOString()}-data.json`, JSON.stringify(data, null, 4), (err) => err && console.log(`[ERROR]: `,err));
});