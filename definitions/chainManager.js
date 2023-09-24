module.exports = function(s,config,lang,Theme,mainBackgroundColor,textWhiteOnBgDark){
    return {
         "section": "Chain Manager",
         "blocks": {
             "Saved Filters": {
                "name": lang["Saved Filters"],
                "color": "green",
                "info": [
                    {
                       "fieldType": "btn-group",
                       "class": "mb-3",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `btn-success add-filter`,
                               "btnContent": `${lang['Add New']}`,
                           },
                           {
                               "fieldType": "btn",
                               "class": `btn-danger delete-filter`,
                               "btnContent": `${lang['Delete']}`,
                           },
                       ],
                    },
                    {
                       "id": "chain_selector",
                       "field": lang["Chains"],
                       "fieldType": "select",
                    },
                    {
                        hidden:true,
                       "name": "id",
                    },
                    {
                      "name": "enabled",
                      "field": lang.Enabled,
                      "fieldType": "select",
                      "default": "1",
                      "possible": [
                         {
                            "name": "No",
                            "value": "0",
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                            "selected": true
                         }
                      ]
                    },
                    {
                       "name": "name",
                       "field": lang['Filter Name'],
                    },
                ]
            },
            "Conditions": {
               "name": lang["Conditions"],
               "color": "blue",
               "section-class": "where",
               "info": [
                   {
                      "fieldType": "btn-group",
                      "class": "mb-3",
                      "btns": [
                          {
                              "fieldType": "btn",
                              "class": `btn-success add`,
                              "btnContent": `${lang['Add New']}`,
                          },
                      ],
                   },
                   {
                       "id": 'detector_filters_where',
                       "fieldType": 'div',
                   },
               ]
           },
            "Action for Selected": {
               "name": lang["Action for Selected"],
               "color": "red",
               "blockquote": lang.eventFilterActionText,
               "section-class": "actions",
               "info": [
                   {
                     "name": "actions=halt",
                     "field": lang["Drop Event"],
                     "fieldType": "select",
                     "form-group-class": "actions-row",
                     "description": lang["fieldTextActionsHalt"],
                     "default": "0",
                     "possible": [
                        {
                           "name": "No",
                           "value": "0",
                           "selected": true
                        },
                        {
                           "name": lang.Yes,
                           "value": "1",
                        }
                     ]
                   },
                   {
                     "name": "actions=save",
                     "field": lang['Save Events'],
                     "fieldType": "select",
                     "default": "Yes",
                     "form-group-class": "actions-row",
                     "possible": [
                        {
                           "name": lang['Original Choice'],
                           "value": "",
                           "selected": true
                        },
                        {
                           "name": lang.Yes,
                           "value": "1",
                        }
                     ]
                   },
                   {
                      "name": "actions=indifference",
                      "field": lang["Modify Indifference"],
                      "description": lang["fieldTextActionsIndifference"],
                      "form-group-class": "actions-row",
                   },
                   {
                     "name": "actions=webhook",
                     "field": lang['Legacy Webhook'],
                     "fieldType": "select",
                     "form-group-class": "actions-row",
                     "default": "",
                     "example": "1",
                     "possible": [
                        {
                           "name": lang['Original Choice'],
                           "value": "",
                           "selected": true
                        },
                        {
                           "name": lang.Yes,
                           "value": "1",
                        }
                     ]
                   },
                  {
                     "name": "actions=command",
                     "field": lang["Detector Command"],
                     "fieldType": "select",
                     "form-group-class": "actions-row",
                     "description": lang["fieldTextActionsCommand"],
                     "default": "No",
                     "form-group-class": "actions-row",
                     "possible": [
                        {
                           "name": lang['Original Choice'],
                           "value": "",
                           "selected": true
                        },
                        {
                           "name": lang.Yes,
                           "value": "1",
                        }
                     ]
                  },
                  {
                     "name": "actions=record",
                     "field": lang["Use Record Method"],
                     "fieldType": "select",
                     "description": lang["fieldTextActionsRecord"],
                     "default": "",
                     "form-group-class": "actions-row",
                     "possible": [
                        {
                           "name": lang['Original Choice'],
                           "value": "",
                           "selected": true
                        },
                        {
                           "name": lang.Yes,
                           "value": "1",
                        }
                     ]
                  },
               ]
           },
         }
     }
}
