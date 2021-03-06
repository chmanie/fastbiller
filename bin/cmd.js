#!/usr/bin/env node

/* 
TODO:
- provide option to just show available projects
- get rid of -c option as customerId it is available in a project. get project first then add hours

*/


'use strict';

var program = require('commander')
  , request = require('request')
  , ProgressBar = require('progress')
  , js2xmlparser = require('js2xmlparser')
  , async = require('async')
  , parseXmlString = require('xml2js').parseString
  , colors = require('colors')
  , fs = require('fs')
  , path = require('path')
  , crypto = require('crypto')
  , prompt = require('prompt')
  , home = getUserHome()
  , config = path.join(home, '.fastbiller')
  , passphrase = 'bbebdde04a05a29bab7d25ba5ee89ef997f3230f63627b5b0725e42817a2f0d0'
  , bar;

colors.setTheme({
  success: 'green',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

program
  .version('0.1.0')
  .option('-p, --project <n>', 'Fastbill project id', parseInt)
  .option('-c, --customer <n>', 'Fastbill customer id', parseInt)
  .option('-f, --file <s>', 'clocker data file (json)')
  .parse(process.argv);

initialize();

function initialize() {
  fs.open(config, 'r', function (err) {
    if (err) { // config file does not exist
      if (process.stdin.isTTY) {
        askForCredentials(function (creds) {
          saveCredentials(creds);
        });
      } else {
        out.fatal('Please run fastbiller one time without piping data into it.');
      }
    } else {
      readCredentials(workflow);
    }
  });
}

function askForCredentials(cb) {
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();
  prompt.get([
    { name: 'email', description: 'E-Mail Address used for fastbill: ' },
    { name: 'apiKey', description: 'Fastbill API-key: ' }
  ], function (err, result) {
    cb(result);
  });
}

function saveCredentials(creds) {
  creds.email = encrypt(creds.email);
  creds.apiKey = encrypt(creds.apiKey);
  
  fs.writeFile(config, JSON.stringify(creds), { mode: 436 }, function (err) {
    if (err) return out.fatal('Could not write config file');
    out.success('Credentials saved successfully');
  });
}

function readCredentials(cb) {
  fs.readFile(config, function (err, data){
    if (err) return out.fatal('Could not read config file');
    try {
      data = JSON.parse(data);
    } catch (e) {
      out.fatal('Could not parse config file');
    }
    data.email = decrypt(data.email);
    data.apiKey = decrypt(data.apiKey);
    cb(data);
  });
}

function workflow(creds) {
  if (typeof program.project !== 'number') {
    out.fatal('Please provide a valid customer id in number format');
  }

  if (typeof program.customer !== 'number') {
    out.fatal('Please provide a valid customer id in number format');
  }

  if (typeof program.file === 'string') {
    fs.readFile(program.file, { encoding: 'utf8' }, function (err, data) {
      if (err) return out.fatal('Could not read hours file.');
      execute(data, creds);
    });
  } else {
    withStdin(function (data) {
      execute(data, creds);
    });
  }

}

function execute(data, creds) {
  var parsedData;
  try {
    parsedData = JSON.parse(data);
  } catch (e) {
    out.fatal('Could not parse input. No valid JSON.');
  }

  if ('object' !== typeof parsedData || !parsedData[0] || !parsedData[0].hours) {
    return out.fatal('Incorrect input data. Please provide json data generated by clocker.');
  }

  var hours = parsedData[0].hours;

  bar = new ProgressBar(':bar', { total: hours.length });

  async.map(hours, createTime(creds), function (err, results) {
    if (err) {
      return out.fatal('Argh! Could not send hours. Here\'s why: ' + err);
    }
    out.success('Hours successfully transferred to fastbill!');
    out.info('HOUR-IDs: '.help + results.join(', '));
  });
}

var out = {
  fatal: function (errstr) {
    console.log('ERROR: '.error + errstr);
    process.exit(1);
  },
  error: function (errstr) {
    console.log('ERROR: '.error + errstr);
  },
  success: function (okstr) {
    console.log('SUCCESS: '.success + okstr);
  },
  info: function (infostr) {
    console.log(infostr);
  }
};

function withStdin(cb) {
  var str = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (chunk) { str += chunk; });
  process.stdin.on('end', function () { cb(str); }).resume();
}

function createTime(creds) {
  return function (data, callback) {
    var req = {
      service: 'time.create',
      data: decamelize({
        customerId: program.customer,
        projectId: program.project,
        date: data.date,
        startTime: '00:00:00',
        minutes: data.hours*60
      })
    };

    request.post('https://my.fastbill.com/api/1.0/api.php', {
      auth: {
        user: creds.email,
        pass: creds.apiKey,
        sendImmediately: true
      },
      body: js2xmlparser('fbapi', req)
    }, function (err, res, body) {
      if (err) return callback(err);
      parseXmlString(body, function (err, result) {
        if (err) return callback(err);
        bar.tick();
        var error;
        try {
          error = result.FBAPI.RESPONSE[0].ERRORS[0].ERROR[0];
        } catch (e){}
        finally {
          callback(error, result.FBAPI.RESPONSE[0]['TIME_ID']);
        }
      });
    });
  };
}

function encrypt (str) {
  var cipher = crypto.createCipher('aes-256-cbc', passphrase);
  var encrypted = cipher.update(str, 'utf8', 'base64');
  return encrypted + cipher.final('base64');
}

function decrypt (str) {
  var decipher = crypto.createDecipher('aes-256-cbc', passphrase);
  var decrypted = decipher.update(str, 'base64', 'utf8');
  return decrypted + decipher.final('utf8');
}

/* Decamelize object keys to use underscores */
function decamelize(obj) {
  var out = {};
  Object.keys(obj).forEach(function (elm) {
    var newKey = elm.replace(/[A-Z]/g, function (match) {
      return '_' + match.toLowerCase();
    });
    if (obj[elm]) out[newKey] = obj[elm];
  });
  return out;
}

function getUserHome() {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}