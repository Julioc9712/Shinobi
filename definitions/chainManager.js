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
                       "class": "col-2 flex-direction-column",
                       isFormGroupGroup: true,
                       "noHeader": true,
                       "info": [
                           {
                               "name": "name",
                               "field": lang["Name"],
                           },
                           {
                               "name": "ignitor",
                               "field": lang['Ignitor'],
                               "fieldType": "select"
                           },
                           {
                              "fieldType": "btn-group",
                              "class": "mb-3",
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-primary add-new`,
                                      "btnContent": `<i class="fa fa-plus"></i> ${lang['Add New']}`,
                                  }
                              ],
                           },
                           {
                              "fieldType": "div",
                              "id": "chainManager-list",
                           },
                        ]
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
