const axios = require('axios');
const fs = require('fs');
const moment = require('moment');
const { filter, map } = require('lodash');

let offset = 0;
let nextUrl = 0;

const checkKeywords = ({ objeto, data_entrega_proposta }) => {
  const keywords = [
    'Tecnologia da Informática',
    'TI',
    'Software',
  ];

  if (!objeto) return false;

  return keywords
    .map(word =>
      objeto.includes(word) && // includes interested words
      moment(data_entrega_proposta).diff(moment(), 'days') > 5 // Not closed
    )
    .reduce((acc, cur) => acc || cur)
}

const loadMoreData = (loaded, c=5) => {

  if (nextUrl === undefined) {
    console.log('No next url');
    return;
  }
  const url = `http://compras.dados.gov.br${nextUrl.href || '/licitacoes/v1/licitacoes.json'}`;

  return axios
    .get(url)
    .then(res => res.data)
    .then(data => {
        // save next url
        nextUrl = data._links.next;
        console.log('nextUrl, url', nextUrl, url);

        // get filtered data
        const result = [
          ...(loaded ? loaded : []),
          ...filter(data._embedded.licitacoes, checkKeywords)
            .map(item => ({ objeto: item.objeto, link: item._links}))
        ];

        // Call loadmore or return result, if no next
        return nextUrl === undefined || c < 5
          ? new Promise((resolve, reject) => resolve(result))
          : loadMoreData(result, c + 1)
      });
}

loadMoreData().then((data) => {
  fs.writeFile('data.json', JSON.stringify(data, null, 4), (err) => err && console.log(`[ERROR]: `,err));
});