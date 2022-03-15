//# sourceURL=application.js

//
//  application.js
//  RisingHill
//
//  Created by Maxwell Spiegelman on 11/25/20.
//

var hillBaseUrl = 'https://thehill.com/hilltv/rising?page=6';
var hillBaseUrl = 'https://thehill.com/hilltv/rising';
var playerBaseUrl = 'https://cdn.jwplayer.com/v2/playlists/';
var serverBaseUrl;

var lastPageNum = 0;
var episodes = {};

App.onLaunch = function(options) {
    console.log("\AYO: 1\n");
    
    var loadingScreen = createLoadingDocument();
    navigationDocument.pushDocument(loadingScreen);
    
    setEpisodes(episodes => {
        var playlistsDocument = createPlaylistsDocument(episodes);
        
        playlistsDocument.addEventListener('select', playSelectedEpisode);
        playlistsDocument.addEventListener('play', playSelectedEpisode);
        console.log("\nLOL\n");
        
        navigationDocument.replaceDocument(playlistsDocument, loadingScreen);
    });
}

App.onWillResignActive = function() {
}

App.onDidEnterBackground = function() {
}

App.onWillEnterForeground = function() {
}

App.onDidBecomeActive = function() {
}

var createAlert = function(title, description) {
    var alertString = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
          <alertTemplate>
            <title>${title}</title>
            <description>${description}</description>
          </alertTemplate>
        </document>`
    
    var parser = new DOMParser();
    var alertDoc = parser.parseFromString(alertString, "application/xml");

    return alertDoc
}

function createLoadingDocument(text) {
    var loadingMarkup = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <loadingTemplate>
                <activityIndicator>
                    <text>Please wait...</text>
                </activityIndicator>
            </loadingTemplate>
        </document>
    `;

    return new DOMParser().parseFromString(loadingMarkup, 'application/xml');
}

function callEndpoint(method, url, onloadCallback) {
    var templateXHR = new XMLHttpRequest();
    templateXHR.responseType = "document";
    templateXHR.addEventListener("load", function() {
        onloadCallback(templateXHR.responseText);
    }, false);
    templateXHR.open(method, url, true);
    templateXHR.send();
}

function getEndpoint(url, onloadCallback) {
    callEndpoint("GET", url, onloadCallback);
}

function setEpisodes(callback, count = 10) {
    addEpisodesFromPage(lastPageNum, callback, count - Object.keys(episodes).length);
}

function addEpisodesFromPage(pageNum, callback, maxCountToAdd = 0) {
    getEndpoint(hillBaseUrl + (pageNum > 0 ? '?page=' + pageNum : ''), (responseText) => {
        lastPageNum = pageNum;
        
        const matchedEpisodes = Array.from(
            responseText.matchAll('(\\d+)-rising-(january|february|march|april|may|june|july|august|september|october|november|december)-(\\d?\\d)-(\\d\\d\\d\\d)')
        ).reduce((episodeDict, match) => ({
            ...episodeDict,
            [match[2].charAt(0).toUpperCase() + match[2].slice(1) + ' ' + match[3] + ', ' + match[4]]: '/' + match[0]
        }), {});
        episodes = { ...episodes, ...matchedEpisodes };
        
        const remainingToAdd = maxCountToAdd - Object.keys(matchedEpisodes).length;
        if (remainingToAdd <= 0) {
            callback(Object.keys(episodes).map(title => ({ title, path: episodes[title] })).sort((a, b) => (a.path > b.path) ? -1 : 1));
        } else {
            addEpisodesFromPage(lastPageNum + 1, callback, remainingToAdd);
        }
    });
}

function createEpisodeElement(episode) {
    return `
        <lockup path="${episode.path}">
            <img src="https://thehill.com/sites/default/files/styles/thumb_opinion/public/rising_hill.tv_rising_krystal_saagar.png" width="250" height="376" />
            <title>${episode.title}</title>
        </lockup>
    `;
}

function createPlaylistsDocument(episodes) {
    var playlistsMarkup = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <catalogTemplate>
                <banner>
                    <title>Rising</title>
                </banner>
                <list>
                  <section>
                        <listItemLockup>
                            <title>Episodes</title>
                            <decorationLabel>${episodes.length}</decorationLabel>
                            <relatedContent>
                                <grid>
                                    <section>
                                        ${episodes.map(createEpisodeElement).join('')}
                                    </section>
                                </grid>
                            </relatedContent>
                        </listItemLockup>
                        <listItemLockup>
                            <title>Featured</title>
                            <decorationLabel>0</decorationLabel>
                            <relatedContent>
                                <grid>
                                    <section>
                                    </section>
                                </grid>
                            </relatedContent>
                        </listItemLockup>
                    </section>
                </list>
            </catalogTemplate>
        </document>
    `;

    return new DOMParser().parseFromString(playlistsMarkup, 'application/xml');
}

function playSelectedEpisode(event) {
    const lockupElem = event.target;
    const path = lockupElem.getAttribute('path');
    
    console.log(path);
    
    getEndpoint(hillBaseUrl + path, (responseText) => {
        const playlistId = responseText.match('"playlist_id":"([a-zA-Z0-9]*)"')[1];
        
        console.log(playlistId);
        
        getEndpoint(playerBaseUrl + playlistId, (responseText2) => {
            const episodeInfoJson = JSON.parse(responseText2);
            
            const playlist = new Playlist();
            episodeInfoJson.playlist.forEach(video => {
                const mediaItem = new MediaItem('video', video.sources[0].file);
                mediaItem.title = video.title;
                mediaItem.description = video.description;
                mediaItem.artworkImageURL = video.image;
                playlist.push(mediaItem);
            });
            
            const player = new Player();
            player.playlist = playlist;
            
            player.play();
        });
    });
    
}
