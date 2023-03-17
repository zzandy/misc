// ==UserScript==
// @name         Out-of-the-loop
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://old.reddit.com/r/OutOfTheLoop/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const rx = /^(?:(?:Out of the loop:? ?|OOL)?What(?:['’]?s| is) (?:going on|the deal|up) with |Why are people talking about )(?:all )?(?:the )?/i;

    fixTitles();

    let obs = new MutationObserver(fixTitles)
    obs.observe(document.getElementById('siteTable'), {childList:true});

    function fixTitles(){
        return [].filter.call(document.getElementsByClassName('title'), e=>e.tagName == 'A' && !e.target)
            .forEach(a=>{a.innerText=beautify(a.innerText)});
    }

    function beautify(title){
        title = title.replace(rx, '');
        return title[0].toUpperCase() + title.slice(1);
    }
})();