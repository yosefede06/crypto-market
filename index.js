/**
 * For platforms/browsers not supporting at method
 * @param n
 * @returns {undefined|*}
 */
function at(n) {
    // ToInteger() abstract op
    n = Math.trunc(n) || 0;
    // Allow negative indexing from the end
    if (n < 0) n += this.length;
    // OOB access is guaranteed to return undefined
    if (n < 0 || n >= this.length) return undefined;
    // Otherwise, this is just normal property access
    return this[n];
}

const TypedArray = Reflect.getPrototypeOf(Int8Array);
for (const C of [Array, String, TypedArray]) {
    Object.defineProperty(C.prototype, "at",
        { value: at,
            writable: true,
            enumerable: false,
            configurable: true });
}



let table_loaded = false
const FILTER = ['P', 'c', 's']

var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});
var formatter_percent = new Intl.NumberFormat('default', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

let chart_metadata = {}

function full_elements_order(element, metadata){
    for (let i = 0; i < metadata.length; i++) {
        element = add_child(element, full_element(metadata[i]["type"], metadata[i]["properties"]))
        metadata[i]["text"] ? add_text(element, metadata[i]["text"]) : undefined
    }
    return element
}

function full_elements_inline(element, metadata){
    let last_child = null
    for (let i = 0; i < metadata.length; i++) {
        last_child = add_child(element, full_element(metadata[i]["type"], metadata[i]["properties"]))
        metadata[i]["text"] ? add_text(last_child, metadata[i]["text"]) : undefined
    }
    return last_child
}

function full_element(type, properties){
    let element = create_element(type)
    for (let key in properties) {
        add_attribute(element, key, properties[key])
    }
    return element
}

function data_fill_column(price, title, class_name, down_value){
    let txt = "fw-bolder d-block fs-6 " + class_name
    let td = create_element("td")
    full_elements_inline(td,
        [
            {
                "type": "span",
                "properties":
                    {
                        "class" : txt,
                        "style": "white-space: nowrap"
                    },
                "text" : price
            },
            {
                "type": "span",
                "properties":
                    {
                        "class" : "text-gray-400 fw-bold d-block fs-7 " + set_down_class_text(title, class_name)
                    },
                "text" : `${set_down_text(title, down_value)}`
            },
        ]
    )
    return td;
}

function set_down_text(title, down_value){
    if(title){
        return down_value
    }
    else{
        return "Binance"
    }
}

function set_down_class_text(title, class_name){
    if(title){
        return class_name.substring(0, class_name.length - 1) + "P";
    }
    else{
        return ""
    }
}

function create_element(type){
    return document.createElement(type)
}

function add_attribute(element, property, data){
    element.setAttribute(property, data)
}

function add_text(element, data){
    add_child(element, document.createTextNode(data))
}

function add_child(element, child){
    element.appendChild(child)
    return child
}

const element = document.getElementById("tbody-activity")
const column_function = {
    "data_fill" : data_fill_column,
    "logo" : logo,
}
var table = undefined
let first_call = true
let instance = undefined
function generate_table() {
    instance = new Binance(binanceWebSocket, 1, (metadata)=>{
        if(!first_call) {
            metadata.forEach((symbol)=> {
                update_row(symbol)

            })
            // console.log(chart_metadata)
        }
        else{
            metadata.forEach((symbol)=> {
                chart_metadata[symbol.s] = {data: [symbol.c]}
                new_row(element, symbol)
                init_chart(document.getElementById(`${symbol.s}-chart`), chart_metadata[symbol.s])
            })
            create_table()
        }
        first_call = false
    })
    instance.run()

}

function update_header(inBlock){
    $("#last_block").html(inBlock.b_no)
    $("#last_miner").html( inBlock.b_miner)
}

function create_table() {
    table = $("#performance-id").DataTable({
        responsive: {
            details: false
        },
        order: [[0, 'desc']],
        // sDom: 'i',
        scrollY: `${(window.innerHeight * 0.61).toString()}px`,
        scrollCollapse: true,
        paging: false,
    });
    table_loaded = true
    return false
}
function toFormat(key, value){
    if(key==="P"){
        return formatter_percent.format(value/100);
    }
    else if(key==="s"){
        return value.replace("USDT", "")
    }
    else{
        return formatter.format(value)
    }

}

function update_row(symbol){
    if(symbol.s in chart_metadata){
        chart_metadata[symbol.s]["data"].push(symbol.c)
        chart_metadata[symbol.s]["chart"].updateSeries([{
            data: chart_metadata[symbol.s]["data"]
        }])
        // set chart color
        // min of two values to start setting color properties
        if(chart_metadata[symbol.s]["data"].length >= 2) {
            last_element = chart_metadata[symbol.s]["data"].at(-1)
            before_last_element = chart_metadata[symbol.s]["data"].at(-2)
            if (last_element > before_last_element) {
                chart_metadata[symbol.s]["chart"].updateOptions({
                    colors: [KTUtil.getCssVariableValue("--bs-success")]
                })
            }
            else if (last_element < before_last_element) {
                chart_metadata[symbol.s]["chart"].updateOptions({
                    colors: [KTUtil.getCssVariableValue("--bs-danger")]
                })
            }
        }
    }
    for(let key in symbol){
        // 24H
        if(instance.ticker.includes("miniTicker") && key === "o"){

            $(`.${symbol.s}-P`).html(formatter_percent.format(((parseFloat(symbol.c)/parseFloat(symbol.o)) - 1)))
        }
        else {
            FILTER.includes(key) ? $(`.${symbol.s}-${key}`).html(toFormat(key, symbol[key])) : undefined
        }
    }
}

function new_row(element, symbol){
    let tr = create_element("tr")

    let name_logo = symbol.s.toLowerCase().replace("usdt", "")
        add_child(tr, column_function["logo"](name_logo))
        for (let key in symbol) {
            FILTER.includes(key) ? add_child(tr, column_function["data_fill"](toFormat(key, symbol[key]), down_text(symbol, key), symbol.s + "-" + key, toFormat("P", symbol.P))) : undefined
        }
        add_child(tr, chart_element(symbol.s))
        add_child(element, tr)
}

function down_text(symbol, key){
    return key === 'c' && window.innerWidth <= 479
}

function chart_element(id_val){
    let td = create_element("td")
    full_elements_order(td,
        [
            {
                "type": "div",
                "properties":
                    {
                        "id": `${id_val}-chart`,
                        "class": "mt-n7 min-h-auto",
                        "style": `width: ${window.innerWidth * 0.1 + 25}px; height: 80px`,
                    }
            }
            ]
    )
    return td;
}

function logo(image){
    let td = create_element("td")
    full_elements_order(td,
        [
            {
                "type": "div",
                "properties":
                    {
                        "class" : "symbol symbol-40px"
                    }
            },

            {
                "type": "span",
                "properties":
                    {
                        "class": "symbol-label"
                    }
            },
            {
                "type" : "i",
                "properties" :
                    {
                        "src" : image,
                        "style": `font-size: 34px; filter:  ${set_logo_color()}`,
                        "class":`cf cf-${image} dark-image-class`
                    }
            }
        ]
    )
    return td;
}



const arr_ticker = ["!ticker_1h@arr@3000ms", "!ticker_4h@arr@3000ms", "!miniTicker@arr@3000ms"]
Array.from(document.getElementsByClassName("ticker-class")).forEach((value, ind) => {
    value.addEventListener("change",(element)=> {
        if(table_loaded) {
            instance.ticker = arr_ticker[ind]
        }
    })
})
Array.from(document.getElementsByClassName("market-type")).forEach((value, ind) => {
    value.addEventListener("change",(element)=> {
        console.log(ind)
        // instance.ticker = arr_ticker[ind]
    })
})


generate_table()

function set_logo_color(){
    return check_dark_mode() ? "brightness(0) invert(1)" : "brightness(0)"
}

function check_dark_mode(){
    return localStorage.getItem("dark-mode")
}

function set_light_mode(){
    KTApp.setThemeMode('light');
    $(".dark-image-class").css("filter", "brightness(0)")
    $("#dark_icon").attr("class", "fonticon-moon fs-2 text-dark")
    $("#header-top-color").attr("content", "#f4f6f9")
    localStorage.removeItem("dark-mode")
}

function set_dark_mode(){
    KTApp.setThemeMode('dark');
    $(".dark-image-class").css("filter", "brightness(0) invert(1)")
    $("#dark_icon").attr("class", "fonticon-sun fs-2")
    $("#header-top-color").attr("content", "#151521")
    localStorage.setItem("dark-mode", "true")

}

function toggle_dark(change) {
    change ? (check_dark_mode() ? set_light_mode() : set_dark_mode()) : (check_dark_mode() ? set_dark_mode() : set_light_mode())
}
toggle_dark(false)
function dark_listener() {
    if (table_loaded) {
        toggle_dark(true)
    }
}


function f() {
    document.getElementById('dropdown-exchanges-id').innerHTML = 'Bybit'
}

function init_chart(id, data) {
        var a = parseInt(KTUtil.css(id, "height")),
            t = KTUtil.getCssVariableValue("--bs-gray-500"),
            l = KTUtil.getCssVariableValue("--bs-border-dashed-color"),
            o = KTUtil.getCssVariableValue("--bs-gray-400"),
            r = KTUtil.getCssVariableValue("--bs-success"),
            dang = KTUtil.getCssVariableValue("--bs-danger"),
            i = id.getAttribute("data-kt-chart-info")
            data["chart"] = new ApexCharts(id, {
                options: {
                    responsive: true,
                },
                series: [{
                    data: data["data"]
                }],
                chart: {
                    fontFamily: "inherit",
                    type: "area",

                    height: a,
                    toolbar: {
                        show: !1
                    }
                },
                plotOptions: {
                    area: {
                        fillTo: 'end'
                    }
                },
                legend: {
                    show: !1
                },
                dataLabels: {
                    enabled: !1
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 0.2,
                        opacityFrom: .6,
                        // shadeIntensity: 1,
                        // opacityFrom: .4,
                        opacityTo: 0.20,
                        stops: [0, 80, 100],
                    }
                },
                stroke: {
                    curve: "smooth",
                    show: !0,
                    width: 2,
                    colors: [o]
                },
                tooltip: {
                    enabled: false

                },
                xaxis: {
                    axisBorder: {
                        show: !1
                    },
                    axisTicks: {
                        show: !1
                    },
                    labels: {
                        show: !1
                    },
                },
                yaxis: {
                    show: false,
                    labels: {
                        show: !1
                    }
                },
                states: {
                    normal: {
                        filter: {
                            type: "none",
                            value: 0
                        }
                    },
                    hover: {
                        filter: {
                            type: "none",
                            value: 0
                        }
                    },
                    active: {
                        allowMultipleDataPointsSelection: !1,
                        filter: {
                            type: "none",
                            value: 0
                        }
                    }
                },
                colors: [r],
                grid: {
                    padding: {
                        top:0,
                        bottom:0,
                        left: 5,
                        right: 0
                    },
                    borderColor: l,
                    strokeDashArray: 0,
                    yaxis: {
                        lines: {
                            show: !1
                        }
                    }
                },
                markers: {
                    strokeColor: o,
                    strokeWidth: 3
                }
            });

        setTimeout((function () {
            data["chart"].render()
        }), 0)
}
// Chart.defaults.global.tooltips.enabled = false;