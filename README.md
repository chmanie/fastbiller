# Fastbiller

export [clocker](https://github.com/substack/clocker) data to [fastbill](http://www.fastbill.com)

## Installation

```bash
$ npm install fastbiller -g
```

## Usage

```bash
clocker data | fastbiller -c [customerID] -p [projectID]
```

or

```bash
fastbiller -c [customerID] -p [projectID] -f [clockerdata.json]
```
    
```bash
fastbiller --help

Options:

  -h, --help          output usage information
  -V, --version       output the version number
  -p, --project <n>   Fastbill project id
  -c, --customer <n>  Fastbill customer id
  -f, --file <s>      clocker data file (json)
```