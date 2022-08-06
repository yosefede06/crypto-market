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

function data_fill_column(price, title, class_name){
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
                        "class" : "text-gray-400 fw-bold d-block fs-7"
                    },
                "text" : "Binance"
            },
        ]
    )
    return td;
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
        }
        else{
            metadata.forEach((symbol)=> {
                new_row(element, symbol)
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
            details: {
                type: 'inline'
            }
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
    // if(imageExists(`./assets/symbols/${name_logo}.svg`)) {
        add_child(tr, column_function["logo"](name_logo))
        for (let key in symbol) {
            FILTER.includes(key) ? add_child(tr, column_function["data_fill"](toFormat(key, symbol[key]), "Block number", symbol.s + "-" + key)) : undefined
        }
        add_child(element, tr)
    // }
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
    return !localStorage.getItem("light-mode")
}

function set_light_mode(){
    KTApp.setThemeMode('light');
    $(".dark-image-class").css("filter", "brightness(0)")
    $("#dark_icon").attr("class", "fonticon-moon fs-2 text-dark")
    localStorage.setItem("light-mode", "true")
}

function set_dark_mode(){
    KTApp.setThemeMode('dark');
    $(".dark-image-class").css("filter", "brightness(0) invert(1)")
    $("#dark_icon").attr("class", "fonticon-sun fs-2")
    localStorage.removeItem("light-mode")
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

