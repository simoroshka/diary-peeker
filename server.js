var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var Iconv = require('iconv').Iconv;

function getUserData(id) {

    function parseUserData (html) {
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
      return {
        readers: moveToArray(readers),
        favorites: moveToArray(favorites)
      };
    };

    function saveUserData (data) {
      fs.writeFile('output.json', JSON.stringify(data, null, 4), function(err){
        console.log('File successfully written! - Check your project directory for the output.json file');
      })
    }

    function markMutualFriends (data) {
      data.readers.forEach(function(reader, index) {
        var friend = data.favorites.find(fav => reader.name === fav.name);
        if (friend) {
          reader.mutual = true;
          friend.mutual = true;
        }
      });
      return data;
    }

    // get only our data and remove all DOM crap from cheerio
    function moveToArray (data) {
      var array = [];
      for (var i = 0; i < data.length; i++) {
         array.push(data[i]);
      }
      return array;
    }

    function processUserData(html) {
      var result = parseUserData(html);
      result = markMutualFriends(result);

      var mutualFriends = result.readers.filter(user => user.mutual);
      var youRead = result.favorites.filter(user => !user.mutual);
      var youDontRead = result.readers.filter(user => !user.mutual);

      result['youRead'] = youRead;
      result['youDontRead'] = youDontRead;
      result['mutualFriends'] = mutualFriends;

      return result;
    }

    return function(req, res) {
      // Let's scrape
      var url = 'http://www.diary.ru/member/?' + id + '&fullreaderslist&fullfavoriteslist';
      request({url: url, encoding: null}, function(error, response, html){
        if(!error){
          var translator = new Iconv('cp1251', 'utf-8');
          var result = processUserData(translator.convert(html));
          saveUserData(result);
          res.render('index', {
              username: "Simoroshka",
              friends: result.mutualFriends,
              youRead: result.youRead,
              youDontRead: result.youDontRead,
            });
        } else {
          res.send("There was a request error");
        }
      })
    }
}

app.get('/', getUserData(466420));

app.set('views', './views');
app.set('view engine', 'pug');

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;
