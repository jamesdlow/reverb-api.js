var Reverb = Reverb || {};

/*!
    Underscore.js templates as a standalone implementation.
    JavaScript micro-templating, similar to John Resig's implementation.
    Underscore templates documentation: http://documentcloud.github.com/underscore/#template
    Modifyed by marlun78
*/
(function () {

    'use strict';

    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    var settings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g
    };

    // When customizing `templateSettings`, if you don't want to define an
    // interpolation, evaluation or escaping regex, we need one that is
    // guaranteed not to match.
    var noMatch = /.^/;

    // Certain characters need to be escaped so that they can be put into a
    // string literal.
    var escapes = {
        '\\': '\\',
        "'": "'",
        'r': '\r',
        'n': '\n',
        't': '\t',
        'u2028': '\u2028',
        'u2029': '\u2029'
    };

    for (var p in escapes) {
        escapes[escapes[p]] = p;
    }

    var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
    var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

    var tmpl = function (text, data, objectName) {
        settings.variable = objectName;

        // Compile the template source, taking care to escape characters that
        // cannot be included in a string literal and then unescape them in code
        // blocks.
        var source = "__p+='" + text
            .replace(escaper, function (match) {
                return '\\' + escapes[match];
            })
            .replace(settings.interpolate || noMatch, function (match, code) {
                return "'+\n(" + unescape(code) + ")+\n'";
            })
            .replace(settings.evaluate || noMatch, function (match, code) {
                return "';\n" + unescape(code) + "\n;__p+='";
            }) + "';\n";

        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) {
            source = 'with(obj||{}){\n' + source + '}\n';
        }

        source = "var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" + source + "return __p;\n";

        var render = new Function(settings.variable || 'obj', source);

        if (data) {
            return render(data);
        }

        var template = function (data) {
            return render.call(this, data);
        };

        // Provide the compiled function source as a convenience for build time
        // precompilation.
        template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

        return template;
    };

    Reverb.tmpl = tmpl;
}());




//  Usage:
//
//  var api = new Reverb.API();
//  var per_page = 5;
//
//  api = new Reverb.API({baseURL: "http://reverb.site/api/"})
//  api.searchListings({query: "fender", price_max: "1"}).done(function(data) { console.log(data.listings) });
//
//  The API uses jquery's ajax method and supports the standard promises interface
//
//  Note that the searchListings will default to condition: 'all'
//
Reverb.API = function(options) {
  if(!options) { options = {}; }
  var apiToken = options.apiToken;
  var baseURL = options.baseURL || "https://reverb.com/api/";

  if(baseURL.slice(-1) !== "/") {
    baseURL += "/";
  }

  function setHeader(xhr) {
    if(apiToken) {
      xhr.setRequestHeader('X-Auth-Token', apiToken);
    }
  }

  function get(url, queryOptions) {
    return $.ajax({
      url: baseURL + url,
      data: queryOptions,
      type: 'GET',
      dataType: 'json',
      error: function(error) { console.log(error);},
      beforeSend: setHeader
    });
  }

  function searchListings(queryOptions) {
    var options = $.extend({condition: 'all'}, queryOptions);
    return get("listings", options);
  }

  function searchAffiliate(queryOptions) {
    var options = $.extend({}, queryOptions, { sort: 'random' });
    return get("collections/affiliate-product-pool", options);
  }

  function handpicked(name, queryOptions) {
    return get("handpicked/" + name, queryOptions);
  }

  function collection(name, queryOptions) {
    return get("collections/" + name, queryOptions);
  }

  function searchPriceguide(queryOptions) {
    return get("priceguide", queryOptions);
  }

  function listingsRelatedToArticle(slug, queryOptions) {
    return get("articles/" + slug + "/related-listings", queryOptions);
  }

  return {
    handpicked: handpicked,
    collection: collection,
    searchListings: searchListings,
    searchPriceguide: searchPriceguide,
    listingsRelatedToArticle: listingsRelatedToArticle,
    searchAffiliate: searchAffiliate
  }

};

//   Example: provide a container in the DOM to hold the listings pulled
//   from the Reverb service.
//
//  -> (a specific search)
//
//  <div data-reverb-embed-listings
//       data-reverb-search-query="something"
//       data-reverb-search-category="electric-guitars"
//       data-reverb-search-price-max="500"
//       data-reverb-search-price-min="100"
//       data-reverb-search-year-max="1979"
//       data-reverb-search-year-min="1970"
//       data-reverb-search-make="fender"
//       data-reverb-search-model="stratocaster"
//       data-reverb-search-per-page="3"
//       data-template="#sidebar-listings-template"></div>
//
//  The following examples use the same page and template options; They have been
//  omitted for brevity to show just the parts that change.
//
//  -> deals under $100
//  <div  data-reverb-embed-handpicked
//        data-reverb-collection-name="deals"
//        data-reverb-search-price-max="100"
//        data-reverb-search-per-page='3'
//        data-template="#blog-inline-720-listings-template"></div>
//
//  -> a curated search (featured collection)
//  <div data-reverb-embed-collection data-reverb-collection-name="80s-strats"></div>
//
//  -> listings related to an article
//  <div data-reverb-embed-related-listings data-article-slug="my-article" data-reverb-search-per-page='3'></div>
//
//
//  You can add an affiliate id as well
//  <div data-reverb-aid='affiliate-code' data-reverb-embed-collection data-reverb-collection-name="80s-strats"></div>
//
Reverb.EmbeddedListings = (function(options) {
  var api;

  if(!options) { options = {} };

  if (options.apiURL) {
    api = new Reverb.API({baseURL: options.apiURL});
  } else {
    api = new Reverb.API();
  }

  var defaultTemplate = "                                                         \
    <ul class='reverb-embedded-listings clearfix'>                                \
      <% $.each(listings, function (index, listing) { %>                          \
      <li class='reverb-embedded-listing'>                                        \
        <a class='reverb-listing-embed' href='<%= listing._links.web.href %>'>    \
          <img src='<%= listing.photos[0]._links.small_crop.href %>'></img>       \
          <div class='reverb-embedded-listing-info'>                              \
          <span class='reverb-embedded-listing-title'><%= listing.title %></span> \
          <span class='reverb-embedded-listing-price'>                            \
            <%= listing.price.symbol %>                                           \
            <%= listing.price.amount %>                                           \
          </span>                                                                 \
          </div>                                                                  \
        </a>                                                                      \
      </li>                                                                       \
      <%})%>                                                                      \
    </ul>                                                                         \
  ";

  function renderer(container) {
    var container = $(container);
    var template = $(container.data("template"));

    if (template.length) {
      template = template.html();
    } else {
      template = defaultTemplate;
    }

    return function(data) {
      var html = Reverb.tmpl(template, {listings: data.listings});

      container.hide().append(html).fadeIn();
    }
  };

  // Pulls all data values prefixed as reverb-search-* from the container
  // element and turns them into a hash of underscored values.
  //
  // e.g. <div data-reverb-search-price-max="500"/> will turn into {"price_max": "500"}
  function extractQueryOptions(container) {
    var options = {}

    $.each($(container).data(), function(k,v) {
      if(k.match(/reverbSearch/)) {
        var paramName = k.replace("reverbSearch","");
        options[snake_case(paramName)] = v;
      }
    });

    // Add affiliate id
    var affiliateId = $(container).data("reverb-aid");

    if(affiliateId) {
      options["_aid"] = affiliateId;
    }

    return options;
  };

  // turns camelCaseWord into camel_case_word
  // Used for parsing data attributes, whose keys are camelized
  function snake_case(camelCaseWord) {
    return camelCaseWord.replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase();
  };


  // Invokes the API function specified. The argumentName specifies the primary
  // argument such as the collection name or article slug which is used to construct
  // the API url. The container specifies where the results should go, and acts
  // as a storage for all the additional api options.
  function embedFromAPI(apiFunction, argumentName, container) {
    var argument = $("[data-" + argumentName + "]").data(argumentName);
    var options = extractQueryOptions(container);

    if (apiFunction.length === 1) {
      // Some API functions take only the options hash
      apiFunction(options).done(renderer(container));
    } else {
      // Others take the name of the collection, plus the options hash
      apiFunction(argument, options).done(renderer(container));
    }
  }

  function init() {
    $("[data-reverb-embed-affiliate]").each(function() {
      embedFromAPI(api.searchAffiliate, null, $(this));
    });

    $("[data-reverb-embed-listings]").each(function() {
      embedFromAPI(api.searchListings, null, $(this));
    });

    $("[data-reverb-embed-handpicked]").each(function() {
      embedFromAPI(api.handpicked, "reverb-collection-name", $(this));
    });

    $("[data-reverb-embed-collection]").each(function() {
      embedFromAPI(api.collection, "reverb-collection-name", $(this));
    });

    $("[data-reverb-embed-related-listings]").each(function() {
      embedFromAPI(api.listingsRelatedToArticle, "article-slug", $(this));
    });
  };

  return {
    init: init
  }
});

$(function() {
  // For development mode to run against your local api, use this to make it
  // hit your local API endpoint. Otherwise, it hits reverb.com/api
  // var embedder = new Reverb.EmbeddedListings({apiURL: "//" + window.location.host + "/api/"});
  var embedder = new Reverb.EmbeddedListings();
  embedder.init();
})
