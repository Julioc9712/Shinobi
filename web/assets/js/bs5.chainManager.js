$(document).ready(function(){
    var theWindow = $('#tab-chainManager')
    var editCanvas = $('#chainManager-canvas')
    var chainList = $('#chainManager-list')
    var loadedChains = {}
    function getChains(){
        return new Promise((resolve) => {
            $.getJSON(getApiPrefix('chains'),function(data){
                resolve(data.chains)
            })
        })
    }
    function buildChainTree(chain){
        var html = `<li class="open-chain-on-canvas cursor-pointer" data-chain="${chain.name}">`
        html += `${chain.name} <small>${chains.ignitor}</small>`
            html += `</ul>`
            $.each(chain.next,function(n,item){
                html += `<li>${item.action}</li>`
            })
            html += `</ul>`
        html += `</li>`
        return html
    }
    async function loadChains(){
        var html = ''
        var chains = await getChains()
        chains.forEach(function(chain){
            loadedChains[chain.name] = chain
            html += buildChainTree(chain)
        })
        chainList.html(html)
    }
    function buildChainLevelForCanvas(chain, level = 1){
        var html = `<span class="label">${chain.action ? chain.action : `${chain.name} <small>${chain.ignitor}` }</small></span>`
        if(chain.next){
            html += `<div class="branch lv${level}">`
            chain.next.forEach(function(item){
                html += buildChainLevelForCanvas(item,level + 1)
            })
            html += `</div>`
        }
        return html
    }
    function drawChainOntoCanvas(chain){
        var html = buildChainLevelForCanvas(chain)
        editCanvas.html(html)
    }
    function addNewIgnitor(form){
        form.next = '[]'
        form.conditions = '[]'
        $.post(getApiPrefix('chains'),form,function(data){
            console.log(data)
        })
    }
    $('body')
    .on('click','.open-chain-on-canvas',function(){
        var chainName = $(this).attr('data-chain')
        var chain = loadedChains[chainName]
        drawChainOntoCanvas(chain)
    });
    addOnTabOpen('chainManager', function () {
        loadChains()
    })
    addOnTabReopen('chainManager', function () {
        loadChains()
    })
    addOnTabAway('chainManager', function () {
    })
})
