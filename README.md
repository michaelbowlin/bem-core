# BEM Core Library

## Что это?

Базовая библиотека блоков для разработки веб-интерфейсов.
Содержит только необходимый минимум для разработки клиентского js и html-шаблонов.

## Использование

Наиболее простым способом начать проект с использованием `bem-core` является [project-stub](https://github.com/bem/project-stub).

Вы также можете добавить библиотеку к себе в проект любым известным вам способом.

## Состав

### Уровни

### Блоки

### Технологии

## История изменений

История изменений доступна на [отдельной странице](CHANGELOG.md).

## Миграция

Миграция описана на [отдельной странице](MIGRATION.md).

## Разработка

### Рабочая копия

1. Получаем исходники:
```
$ git clone git@github.com:bem/bem-core.git
$ cd bem-core
```

2. Устанавливаем зависимости:
```
$ npm install
```
Для последующего запуска локально установленных bem-tools нам потребуется `export PATH=./node_modules/.bin:$PATH` или любой альтернативный способ.

3. С помощью bem-tools устанавливаем все зависимые библиотеки:
```
$ bem make vendor
```

4. Собираем примеры и тесты:
```
$ bem make sets
```

5. Запускаем разработческий сервер:
```
$ bem server
```

### Внесение изменений

1. [Создать issue](https://github.com/bem/bem-core/issues/new) с описанием сути изменений.
2. Определить в какую версию необходимо внести изменения.
3. Сделать feature-branch с указанием номера issue и версии (`issues/<номер issue>@v<номер версии>`) на основе ветки версии.
Например для issue с номером 42 и версией 1: `git checkout -b issues/42@v1 v1`. Если изменения нужно внести в несколько версий, то для каждой из версий создаётся отдельная ветка.
4. Сделать изменения, закоммитить и сделать push. Если это необходимо, то нужно сделать rebase от базовой ветки версии.
5. Создать pull-request на основе созданной ветки (или несколько pull-request-ов для случая изменений в нескольких версиях).
6. Любым способом связать pull-request и issue (например, c помощью комментария).
7. Ждать закрытия pull-request и issue ;-)

### Модульное тестирование

Сборка дефолтного тестового бандла для `ecma__array`: `bem make common.sets/ecma__array.tests/default`
После сборки тестового бандла вы увидите результаты выполнения тестов в консоли.
Их также можно посмотреть в браузере, открыв `common.sets/ecma__array.tests/default.html`.

По аналогии можно запустить тесты для других бем-сущностей, имеющих реализацию в технологии `test.js`.

Для сборки и запуска тестов используется библиотека [bem-pr](https://github.com/narqo/bem-pr). См. [https://github.com/narqo/bem-pr/blob/master/docs/tests.ru.md](подробную информацию) про инфраструктуру тестирования [bem-pr](https://github.com/narqo/bem-pr).
