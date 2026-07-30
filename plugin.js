(function () {
    'use strict';

    function initSeasonsPosters() {
        // Перехватываем системный метод Lampa.Component.add для глубокой интеграции
        var originalComponentAdd = Lampa.Component.add;

        Lampa.Component.add = function (name, component) {
            // Проверяем, что регистрируется компонент полной карточки релиза
            if (name === 'full') {
                var originalFullComponent = component;

                // Переписываем конструктор карточки
                component = function (object) {
                    originalFullComponent.apply(this, arguments);

                    var originalCreate = this.create;

                    // Перехватываем штатный метод создания интерфейса карточки
                    this.create = function () {
                        originalCreate.apply(this, arguments);

                        // Проверяем, что открыт сериал и у него есть сезоны в базе данных
                        if (object.movie && object.movie.number_of_seasons && object.movie.seasons) {
                            var render = this.render();
                            if (!render) return;

                            // Запускаем инжекцию постеров с минимальной задержкой для готовности DOM
                            setTimeout(function () {
                                try {
                                    injectPostersGrid(render, object);
                                } catch (err) {
                                    console.log('Seasons Posters Error: ', err);
                                }
                            }, 150);
                        }
                    };
                };
            }
            // Возвращаем измененный или оригинальный компонент в систему Lampa
            return originalComponentAdd.call(Lampa.Component, name, component);
        };
    }

    function injectPostersGrid(render, object) {
        // Ищем контейнер сезонов по абсолютно всем существующим классам модов Lampa
        var seasonsContainer = render.find('.full-start__seasons, .full-descr__seasons, [data-id="seasons"], .full-start__season, .full-descr__link').first();
        if (!seasonsContainer.length) return;

        // Находим родительский блок, в который будем строить сетку
        var parentContainer = seasonsContainer.parent();
        if (!parentContainer.length) return;

        var seasonsData = object.movie.seasons;
        if (!seasonsData || !seasonsData.length) return;

        // Полностью очищаем стандартные текстовые кнопки
        parentContainer.empty();

        // Строим горизонтальную ленту-сетку
        var gridHtml = $('<div class="seasons-posters-grid"></div>');
        gridHtml.css({
            'display': 'flex',
            'flex-direction': 'row',
            'overflow-x': 'auto',
            'gap': '14px',
            'padding': '15px 5px',
            'width': '100%',
            'scroll-behavior': 'smooth',
            'box-sizing': 'border-box'
        });

        seasonsData.forEach(function (season) {
            // Игнорируем спецвыпуски, если у них нет картинки
            if (season.season_number === 0 && !season.poster_path) return;

            // Конвертируем картинку TMDB через нативный метод ядра Lampa
            var poster = season.poster_path 
                ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                : 'img/plugins/no-poster.png';

            var seasonName = season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон');
            var episodesCount = season.episode_count ? season.episode_count + ' сер.' : '';

            // Верстка карточки постера с обязательным для пультов классом 'selector'
            var item = $(`
                <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 125px; flex-shrink: 0; cursor: pointer; text-align: center; outline: none; margin-right: 5px;">
                    <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 185px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.7); transition: transform 0.15s ease;"></div>
                    <div class="season-poster-title" style="margin-top: 6px; font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${seasonName}</div>
                    <div class="season-poster-count" style="font-size: 11px; color: #aaaaaa; margin-top: 2px;">${episodesCount}</div>
                </div>
            `);

            // Интеграция фокуса для навигации с пульта Смарт-ТВ
            item.on('hover:focus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1.06)',
                    'box-shadow': '0 0 12px #fff',
                    'border': '2px solid #fff'
                });
            }).on('hover:unfocus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1)',
                    'box-shadow': '0 4px 10px rgba(0,0,0,0.7)',
                    'border': 'none'
                });
            });

            // Обработка клика (нажатие кнопки ОК на пульте)
            item.on('hover:enter', function () {
                if (object.selectSeason) {
                    object.selectSeason(season.season_number);
                }
            });

            gridHtml.append(item);
        });

        parentContainer.append(gridHtml);

        // Перезапускаем навигационный модуль Navigator, чтобы пульт увидел новые кнопки-постеры
        if (window.Lampa.Navigator) {
            Lampa.Navigator.update();
        }
    }

    // Регистрация в экосистеме Лампы при старте приложения
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();
