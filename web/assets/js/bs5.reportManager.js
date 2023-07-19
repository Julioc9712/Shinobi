$(document).ready(function(){
    var theTab = $('#tab-reportManager')
    var theList = $('#report-manager-list')
    function getReports(reportId){
        return new Promise((resolve) => {
            $.getJSON(`${getApiPrefix(`reports`)}${reportId ? `/${reportId}` : ''}`,function(response){
                resolve(response.reports)
            })
        })
    }
    async function drawReports(){
        var html = ''
        var reports = await getReports()
        console.log(reports)
        $.each(reports,function(n,report){
            console.log(report)
            html += `<div class="card bg-darker mt-2">
                <div class="card-header">
                    ${report.name}
                </div>
                <div class="card-body">
                    <div>
                        ${report.name}
                    </div>
                    <small class="d-block">
                        <b>${lang['Submitted By']} :</b> ${report.details.submittedBy}
                    </small>
                    <small class="d-block">
                        <b>${lang['Location of Incident']} :</b> ${report.details.locationOfIncident}
                    </small>
                </div>
            </div>`
        })
        theList.html(html)
    }
    addOnTabOpen('reportManager', function () {
        drawReports()
    })
    addOnTabReopen('reportManager', function () {
        drawReports()
    })
    addOnTabAway('reportManager', function () {
    })
})
