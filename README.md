# Fastbiller

export clocker data to fastbill


## Installation

```bash
$ npm install fastbiller
```

## Usage

    clocker data | fastbiller -c [customerID] -p [projectID]
    SUCCESS: Hours successfully transferred to fastbill!
    HOUR-IDs: 12345, 12345, 12345, 12345

    Options:

      -h, --help          output usage information
      -V, --version       output the version number
      -p, --project <n>   Fastbill project id
      -c, --customer <n>  Fastbill customer id
      -f, --file <s>      clocker data file (json)