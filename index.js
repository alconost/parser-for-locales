// Чтобы все работало, файлы из которых мы ищем ключи не должны быть в папке по которой ищем эти ключи. Скрипт должен лежать в папке src/parser/
const fs = require('fs');
const _ = require('lodash');

const testFolder = process.argv[2];    //  путь к папке в которой будем искать (в конце пути должкен быть слеш '/' )
const pathToLocale = process.argv[3];   //  путь к папке с JSON файлами, которые нужно проверить
const pathToResult = process.argv[4]
    ? `${process.argv[4]}unusedKeys.json`
    : './unusedKeys.json';
const resultMessage = `Все ключи проверены\r\nФайл с неиспользуемыми ключами ищите тут:\r\n${pathToResult}`;

let arrayOfPaths = [];
let arrayOfLocalePaths = [];

//  функция, которая находит пути ко всем .js и .ts файлам
getFilePath = (testFolder) => {
    fs.readdirSync(testFolder).forEach(file => {
        const isJsFile = file.slice(-3) === '.js';
        const isTsFile = file.slice(-3) === '.ts';
        const isFolder = !file.includes('.');
        if(isJsFile || isTsFile) {
            arrayOfPaths.push((`${testFolder}${file}`))
        }
        else if(isFolder) {      // проверка на папку, может быть проблема с файлами без расширения
            const folder = `${testFolder}${file}/`;
            getFilePath(folder)
        }
    });
    return arrayOfPaths
};

//  функция для получения путей ко все локалям
getLocalePaths = (pathToLocale) => {
    const isJsonFile = pathToLocale.slice(-5) === '.json';
    if(isJsonFile) {
        arrayOfLocalePaths.push((pathToLocale));
        return arrayOfLocalePaths
    }
    fs.readdirSync(pathToLocale).forEach(file => {
        const isJson = file.slice(-5) === '.json';
        const isFolder = !file.includes('.');
        if(isJson) {
            arrayOfLocalePaths.push((`${pathToLocale}${file}`))
        }
        else if(isFolder) {      // проверка на папку, может быть проблема с файлами без расширения
            const folder = `${pathToLocale}${file}/`;
            getLocalePaths(folder)
        }
    });
    return arrayOfLocalePaths
};

//  Сохранение всех неиспользуемых строк из массива checkArray
saveStrings = (checkArray) => {
    let arrayNotFoundStrings = [];
    const filePath = (getFilePath(testFolder));
    _.forEach(checkArray, (deleteString) => {
        const isFoundString = _.some(filePath, (path) => {
            const data = fs.readFileSync(path, 'utf-8');
            if (data.match(deleteString)) return true
        });
        if(!isFoundString) {
            const unusedKey = `\r\n {"unusedString": "${deleteString}"}`;
            arrayNotFoundStrings.push(unusedKey);
        }
    });
    fs.writeFileSync(pathToResult, `[${arrayNotFoundStrings}\r\n]`);
    console.log(resultMessage)
};



//   расчитывает уровень вложенности для каждого ключа
getDeepObj = (obj, count = 0, arr = []) => {
    count++;
    _.map(obj, (value, key) => {
        if(typeof key !== "number") {
            arr.push([count, key])
        }
        if(typeof value === "object") {
            getDeepObj(value, count, arr)
        }
    });
    return arr
};

//  функция для получения ключей из json файла
buildTreeKeys = (arrayOfLocalePaths) => {
    let pathsToKeys = [];
    _.forEach(arrayOfLocalePaths, (pathToJson) => {
        const data = fs.readFileSync(pathToJson, 'utf-8');
        const object = JSON.parse(data);
        const arr = _.reverse(getDeepObj(object));
        for(let i = 0; i < arr.length; i++) {
            if (arr[i - 1] && arr[i + 1] && arr[i + 1][0] <= arr[i][0] && arr[i][0] >= arr[i - 1][0] || i === 0) {
                let keyPath = [];
                keyPath.push(arr[i][1]);
                let count = arr[i][0];
                for (let j = i; j < arr.length; j++) {
                    if (count > arr[j][0]) {
                        keyPath.push(arr[j][1]);
                        count--
                    }
                }
                keyPath = _.reverse(keyPath);
                keyPath = _.uniq(keyPath);
                pathsToKeys.push(_.join(keyPath, '.'))
            }
        }
    });
    return _.uniq(pathsToKeys)    //  чтобы убрать все повторяющиеся ключи
};

const getDataToCheck = buildTreeKeys(getLocalePaths(pathToLocale));  //  конвертируем данные для поиска

saveStrings(getDataToCheck);  //  вызов функции поиска












