var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

function getUserData(id) {

  return function(req, res) {
    // Let's scrape
    url = 'http://www.diary.ru/member/?' + id + '&fullreaderslist&fullfavoriteslist#readerslist';

    request(url, function(error, response, html){
      if(!error){
        var $ = cheerio.load(html);

        var favorites = $('h6').has('noindex a[name="favoreteslist"]').next('p') //not a typo
                      .find('a')
                      .slice(1).slice(0, -1) //remove first and last links as irrelevant
                      .map(function(){
                        return {
                          name: $(this).text(),
                          url: $(this).attr('href'),
                        }
                      });


        var readers = $('h6').has('noindex a[name="readerslist"]').next('p')
                      .find('a')
                      .slice(1).slice(0, -1)
                      .map(function(){
                        return {
                          name: $(this).text(),
                          memberID: $(this).attr('href').match(/\d+/)[0],
                          isNew: $(this).has('font').length // this will work only if logged in
                        }
                      });

          var readers_fixed = moveToArray(readers);
          var favorites_fixed = moveToArray(favorites);

          var data = {readers_fixed, favorites_fixed};

          // get only our data and remove all DOM crap from cheerio
          function moveToArray(data) {
            var array = [];
            for (var i = 0; i < data.length; i++) {
               array.push(data[i]);
            }
            return array;
          }
      }

      fs.writeFile('output.json', JSON.stringify(data, null, 4), function(err){
        console.log('File successfully written! - Check your project directory for the output.json file');
      })

      res.send('Check your console!')
    })
  }
}



app.get('/scrape', getUserData(466420));

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;
