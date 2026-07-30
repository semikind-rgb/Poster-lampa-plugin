(function () {
    'use strict';

    function initSeasonsPostersAppleTV() {
        // Подключаемся к фабрике компонентов Lampa до генерации разметки в Luxo
        var originalComponentAdd = Lampa.Component.add;

        Lampa.Component.add = function (name, component) {
            if (name === 'full') {
                var originalFull = component;

                // Перехватываем конструктор экрана описания
                component = function (object) {
                    originalFull.apply(this, arguments);

                    // Перехватываем метод, отвечающий за сборку блоков данных (сезонов, похожих и т.д.)
                    if (this.append && typeof this.append === 'function') {
                        var originalAppend = this.append;

                        this.append = function (data) {
                            // Проверяем, содержит ли этот блок данные о сезонах
                            if (data && data.seasons && data.seasons.length) {
                                // Модифицируем структуру данных: заставляем Luxo думать, что это блоки фильмов (коллекция постеров)
                                data.type = 'movie'; 
                                
                                // Пересобираем объекты сезонов в формат карточек фильмов, который Luxo умеет рендерить постерами
                                data.seasons = data.seasons.map(function (season) {
                                    return {
                                        id: season.season_number,
                                        name: season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон'),
                                        title: season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон'),
                                        poster_path: season.poster_path,
                                        img: season.poster_path ? Lampa.TMDB.image('t/p/w300' + season.poster_path) : 'img/plugins/no-poster.png',
                                        quantity_episodes: season.episode_count,
                                        type: 'season_card' // Метка для нашего обработчика клика
                                    };
                                });

                                // Подменяем массив результатов, чтобы движок Luxo отрисовал стандартную сетку/ленту постеров
                                data.results = data.seasons;
                            }
                            
                            // Передаем измененную структуру в нативный рендерер Apple TV
                            originalAppend.apply(this, arguments);
                        };
                    }

                    // Перехватываем событие нажатия (выбора карточки) на пульте Apple TV Remote
                    if (this.onCardClick || object.selectSeason) {
                        var originalSelect = object.selectSeason;
                        
                        // Если навигация завязана на клики по карточкам в ленте
                        renderOverride(this, object);
                    }
                };
            }
            return originalComponentAdd.call(Lampa.Component, name, component);
        };
    }

    function renderOverride(componentContext, objectContext) {
        // Подключаемся к прослушиванию кликов по созданной ленте
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'click' && e.component === 'full' && e.data) {
                // Если кликнули по нашей кастомной карточке сезона
                if (e.data.type === 'season_card' || typeof e.data.id !== 'undefined') {
                    if (objectContext && objectContext.selectSeason) {
                        // Программно запускаем открытие списка серий выбранного сезона
                        objectContext.selectSeason(e.data.id);
                    }
                }
            }
        });
    }

    // Запуск плагина в экосистеме Apple TV Luxo
    if (window.Lampa) {
        initSeasonsPostersAppleTV();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPostersAppleTV();
        });
    }
})();
