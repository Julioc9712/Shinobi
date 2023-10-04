module.exports = function(s,config,lang,Theme,mainBackgroundColor,textWhiteOnBgDark){
    return {
         "section": "Chain Manager",
         "blocks": {
             "Search Settings": {
                "name": lang["Chain Manager"],
                "color": "blue",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "d-flex flex-row",
                "info": [
                    {
                        "fieldType": "div",
                        "class": "col-2",
                        "id": "chainManager-list",
                    },
                    {
                        "fieldType": "div",
                        "class": "col-10",
                        "id": "chainManager-canvas",
                    }
               ]
           },
        }
      }
}
